// Nguồn dữ liệu và việc chấm điểm của quiz, tách khỏi component để chỉ có một
// chỗ biết quiz đến từ đâu.
//
// Hai nguồn cùng tồn tại trong lúc chuyển sang DB:
//   - "static": quiz nhúng trong page data từ file .quiz.yml, chấm ngay ở client
//   - "db": đọc từ Supabase, chấm bằng RPC grade_attempt vì client không có đáp án
// Khi mọi bài đã có quiz trong DB thì bỏ nhánh "static" cùng với transformPageData.

import {renderMd, renderMdInline} from "./md";
import {getSupabase} from "./supabase";

export type QuestionType = "single" | "multi" | "truefalse" | "fill" | "output";

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  promptHtml: string;
  options: string[] | null;
  optionsHtml: string[] | null;
  caseSensitive: boolean;
  /** Chỉ có ở nguồn "static"; nguồn "db" chỉ biết đáp án sau khi nộp bài. */
  answer?: number[] | string[];
  explanationHtml?: string;
};

export type Quiz = {
  origin: "static" | "db";
  quizId: string | null;
  title: string;
  pass: number;
  generated: string | null;
  reviewed: boolean;
  /** false = giữ nguyên thứ tự đáp án như trong đề gốc. */
  shuffle: boolean;
  questions: QuizQuestion[];
};

export type Verdict = {
  correct: boolean;
  answer: number[] | string[];
  explanationHtml: string;
};

export function fromPageData(raw: any): Quiz {
  return {
    origin: "static",
    quizId: null,
    title: raw.title,
    pass: raw.pass,
    generated: raw.generated ?? null,
    reviewed: Boolean(raw.reviewed),
    shuffle: raw.shuffle !== false,
    questions: raw.questions.map((q: any) => ({
      id: q.id,
      type: q.type,
      promptHtml: q.promptHtml,
      options: q.options ?? null,
      optionsHtml: q.optionsHtml ?? null,
      caseSensitive: Boolean(q.caseSensitive),
      answer: q.answer,
      explanationHtml: q.explanationHtml || ""
    }))
  };
}

/** Quiz gắn với một bài học. Trả null nếu bài chưa có quiz nào đọc được. */
export async function loadForLesson(lessonPath: string): Promise<Quiz | null> {
  const sb = await getSupabase();
  if (!sb) return null;

  const {data: rows, error} = await sb
    .from("quizzes")
    .select("id, title, pass_score, model, source, visibility, shuffle_options")
    .eq("lesson_path", lessonPath)
    // Đề của site trước, rồi mới tới đề người dùng chia sẻ cho bài này.
    .order("source", {ascending: true})
    .limit(1);
  if (error) throw error;

  const quiz = rows?.[0];
  if (!quiz) return null;
  return withQuestions(quiz);
}

export async function loadById(quizId: string): Promise<Quiz | null> {
  const sb = await getSupabase();
  if (!sb) return null;

  const {data, error} = await sb
    .from("quizzes")
    .select("id, title, pass_score, model, source, visibility, shuffle_options")
    .eq("id", quizId)
    .maybeSingle();
  if (error) throw error;
  return data ? withQuestions(data) : null;
}

async function withQuestions(row: any): Promise<Quiz> {
  const sb = await getSupabase();
  if (!sb) throw new Error("chưa cấu hình Supabase");

  // questions_public không có cột answer/explanation — đáp án nằm lại server.
  const {data: qs, error} = await sb
    .from("questions_public")
    .select("id, type, prompt, options, case_sensitive")
    .eq("quiz_id", row.id)
    .order("position", {ascending: true});
  if (error) throw error;

  return {
    origin: "db",
    quizId: row.id,
    title: row.title,
    pass: row.pass_score,
    generated: row.source === "auto" ? row.model : null,
    reviewed: row.source !== "auto",
    shuffle: row.shuffle_options !== false,
    questions: (qs ?? []).map((q: any) => ({
      id: q.id,
      type: q.type,
      promptHtml: renderMd(q.prompt),
      options: q.options ?? null,
      optionsHtml: q.options ? q.options.map((o: string) => renderMdInline(o)) : null,
      caseSensitive: Boolean(q.case_sensitive)
    }))
  };
}

// ── Chấm bài ────────────────────────────────────────────────────────────────

function norm(text: unknown, caseSensitive: boolean): string {
  const t = String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim().replace(/[ \t]+/g, " "))
    .filter((l) => l !== "")
    .join("\n");
  return caseSensitive ? t : t.toLowerCase();
}

/** Chấm một câu ở client. Chỉ dùng được với nguồn "static". */
export function matchLocal(q: QuizQuestion, given: unknown): boolean {
  if (!q.answer) return false;
  if (q.type === "fill" || q.type === "output") {
    if (given === undefined || given === null || given === "") return false;
    return (q.answer as string[]).some(
      (a) => norm(a, q.caseSensitive) === norm(given, q.caseSensitive)
    );
  }
  const want = [...(q.answer as number[])].sort((a, b) => a - b);
  const got = [...((given as number[]) ?? [])].sort((a, b) => a - b);
  return got.length === want.length && got.every((v, i) => v === want[i]);
}

export function gradeLocal(
  quiz: Quiz,
  picks: Record<string, unknown>
): Record<string, Verdict> {
  const out: Record<string, Verdict> = {};
  for (const q of quiz.questions) {
    out[q.id] = {
      correct: matchLocal(q, picks[q.id]),
      answer: q.answer ?? [],
      explanationHtml: q.explanationHtml ?? ""
    };
  }
  return out;
}

/**
 * Chấm ở server. Đây là lần duy nhất đáp án đi ra khỏi DB, và chỉ sau khi nộp.
 * Nếu người dùng đã đăng nhập thì RPC tự ghi attempt và hàng đợi ôn tập.
 */
export async function gradeRemote(
  quiz: Quiz,
  picks: Record<string, unknown>,
  record = true
): Promise<Record<string, Verdict>> {
  const sb = await getSupabase();
  if (!sb || !quiz.quizId) throw new Error("chưa cấu hình Supabase");

  const {data, error} = await sb.rpc("grade_attempt", {
    p_quiz: quiz.quizId,
    p_answers: picks,
    // Luyện lại một phần bài thì không ghi attempt — xem grade_attempt.
    p_record: record
  });
  if (error) throw error;

  const out: Record<string, Verdict> = {};
  for (const row of data ?? []) {
    out[row.question_id] = {
      correct: row.correct,
      answer: row.answer ?? [],
      explanationHtml: row.explanation ? renderMd(row.explanation) : ""
    };
  }
  return out;
}

/** Chấm một câu ở client, cho chế độ làm từng câu với nguồn "static". */
export function gradeOneLocal(q: QuizQuestion, given: unknown): Verdict {
  return {
    correct: matchLocal(q, given),
    answer: q.answer ?? [],
    explanationHtml: q.explanationHtml ?? ""
  };
}

/**
 * Chấm đúng một câu, cho chế độ làm từng câu.
 *
 * Không dùng gradeRemote với payload một câu được: grade_attempt trả về đáp án
 * của cả đề, nên gọi nó sau câu đầu tiên là đưa luôn đáp án còn lại xuống
 * trình duyệt.
 */
export async function gradeOneRemote(
  questionId: string,
  given: unknown
): Promise<Verdict> {
  const sb = await getSupabase();
  if (!sb) throw new Error("chưa cấu hình Supabase");

  const {data, error} = await sb.rpc("grade_one", {
    p_question: questionId,
    p_given: given ?? null
  });
  if (error) throw error;

  const row = data?.[0];
  return {
    correct: Boolean(row?.correct),
    answer: row?.answer ?? [],
    explanationHtml: row?.explanation ? renderMd(row.explanation) : ""
  };
}

/**
 * Ghi điểm khi làm xong lượt từng câu. Điểm vẫn do server tính từ đáp án đã
 * lưu; hàng đợi ôn tập không đụng tới vì gradeOneRemote đã cập nhật từng câu.
 */
export async function recordAttempt(quiz: Quiz, picks: Record<string, unknown>) {
  const sb = await getSupabase();
  if (!sb || !quiz.quizId) throw new Error("chưa cấu hình Supabase");

  const {error} = await sb.rpc("record_attempt", {
    p_quiz: quiz.quizId,
    p_answers: picks
  });
  if (error) throw error;
}

/**
 * Gom câu hỏi của nhiều đề thành một ngân hàng để làm một lượt.
 *
 * Đọc lại chính những câu đã có chứ không tạo một đề thứ chín chứa bản sao:
 * bản sao sẽ mang id khác, nên hàng đợi ôn tập coi chúng là câu khác và bảng
 * xếp hạng đếm gấp đôi cùng một kiến thức.
 */
export async function loadBank(slugPrefix: string): Promise<QuizQuestion[]> {
  const sb = await getSupabase();
  if (!sb) return [];

  const {data: quizzes, error} = await sb
    .from("quizzes")
    .select("id, slug")
    .like("slug", `${slugPrefix}%`)
    .order("slug", {ascending: true});
  if (error) throw error;
  if (!quizzes?.length) return [];

  const rank = new Map(quizzes.map((q: any, i: number) => [q.id, i]));

  const {data: qs, error: qErr} = await sb
    .from("questions_public")
    .select("id, quiz_id, position, type, prompt, options, case_sensitive")
    .in("quiz_id", quizzes.map((q: any) => q.id));
  if (qErr) throw qErr;

  // Sắp lại ở client: PostgREST không xếp được theo thứ tự đề rồi mới tới thứ
  // tự câu trong đề bằng một lần gọi.
  return (qs ?? [])
    .sort(
      (a: any, b: any) =>
        (rank.get(a.quiz_id) ?? 0) - (rank.get(b.quiz_id) ?? 0) || a.position - b.position
    )
    .map((q: any) => ({
      id: q.id,
      type: q.type,
      promptHtml: renderMd(q.prompt),
      options: q.options ?? null,
      optionsHtml: q.options ? q.options.map((o: string) => renderMdInline(o)) : null,
      caseSensitive: Boolean(q.case_sensitive)
    }));
}

/**
 * Đọc lại đúng những câu có `key` cho trước (id ổn định trong YAML, ví dụ
 * "ktct-002"), theo đúng thứ tự truyền vào — dùng để dựng một đề "trích" (ví
 * dụ đề giữa kỳ) từ các câu đã có trong ngân hàng, không tạo bản sao. Lý do
 * giống hệt loadBank ở trên.
 *
 * `key` khác với cột `id` thật (uuid) của questions_public — id do DB sinh ra
 * lúc import, còn key là thứ duy nhất còn giữ nguyên giữa YAML và DB.
 */
export async function loadByKeys(keys: string[]): Promise<QuizQuestion[]> {
  const sb = await getSupabase();
  if (!sb || !keys.length) return [];

  const {data: qs, error} = await sb
    .from("questions_public")
    .select("id, key, type, prompt, options, case_sensitive")
    .in("key", keys);
  if (error) throw error;

  const byKey = new Map((qs ?? []).map((q: any) => [q.key, q]));
  return keys
    .filter((key) => byKey.has(key))
    .map((key) => {
      const q = byKey.get(key);
      return {
        id: q.id,
        type: q.type,
        promptHtml: renderMd(q.prompt),
        options: q.options ?? null,
        optionsHtml: q.options ? q.options.map((o: string) => renderMdInline(o)) : null,
        caseSensitive: Boolean(q.case_sensitive)
      };
    });
}

// ── Danh sách đề & ôn tập chéo ──────────────────────────────────────────────

export type QuizRow = {
  id: string;
  title: string;
  lesson_path: string | null;
  source: "auto" | "user";
  visibility: "private" | "unlisted" | "public";
  owner_id: string | null;
  pass_score: number;
  updated_at: string;
};

export async function listQuizzes(): Promise<QuizRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  // RLS đã lọc: chỉ về đề công khai và đề của chính mình.
  const {data, error} = await sb
    .from("quizzes")
    .select("id, title, lesson_path, source, visibility, owner_id, pass_score, updated_at")
    .order("updated_at", {ascending: false});
  if (error) throw error;
  return (data ?? []) as QuizRow[];
}

export async function deleteQuiz(quizId: string) {
  const sb = await getSupabase();
  if (!sb) throw new Error("chưa cấu hình Supabase");
  const {error} = await sb.from("quizzes").delete().eq("id", quizId);
  if (error) throw error;
}

/** Câu hỏi đã đến hạn ôn, gom từ mọi đề. Cần đăng nhập. */
export async function dueReview(limit = 10): Promise<QuizQuestion[]> {
  const sb = await getSupabase();
  if (!sb) return [];

  const {data: due, error} = await sb
    .from("review_items")
    .select("question_id, wrong_count, due_at")
    .lte("due_at", new Date().toISOString())
    // Câu sai nhiều lần lên trước, rồi tới câu đến hạn lâu nhất.
    .order("wrong_count", {ascending: false})
    .order("due_at", {ascending: true})
    .limit(limit);
  if (error) throw error;
  if (!due?.length) return [];

  const {data: qs, error: qErr} = await sb
    .from("questions_public")
    .select("id, type, prompt, options, case_sensitive")
    .in(
      "id",
      due.map((d: any) => d.question_id)
    );
  if (qErr) throw qErr;

  const byId = new Map((qs ?? []).map((q: any) => [q.id, q]));
  return due
    .map((d: any) => byId.get(d.question_id))
    .filter(Boolean)
    .map((q: any) => ({
      id: q.id,
      type: q.type,
      promptHtml: renderMd(q.prompt),
      options: q.options ?? null,
      optionsHtml: q.options ? q.options.map((o: string) => renderMdInline(o)) : null,
      caseSensitive: Boolean(q.case_sensitive)
    }));
}

export async function gradeReview(
  picks: Record<string, unknown>
): Promise<Record<string, Verdict>> {
  const sb = await getSupabase();
  if (!sb) throw new Error("chưa cấu hình Supabase");

  const {data, error} = await sb.rpc("grade_review", {p_answers: picks});
  if (error) throw error;

  const out: Record<string, Verdict> = {};
  for (const row of data ?? []) {
    out[row.question_id] = {
      correct: row.correct,
      answer: row.answer ?? [],
      explanationHtml: row.explanation ? renderMd(row.explanation) : ""
    };
  }
  return out;
}

// ── Soạn đề ─────────────────────────────────────────────────────────────────

export type DraftQuestion = {
  key: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: number[] | string[];
  explanation: string;
  tags: string[];
  caseSensitive: boolean;
};

export type Draft = {
  title: string;
  lessonPath: string;
  visibility: "private" | "unlisted" | "public";
  passScore: number;
  questions: DraftQuestion[];
};

/** Kiểm tra trước khi gửi. Trigger trong DB vẫn kiểm lại — đây chỉ để báo sớm. */
export function validateDraft(draft: Draft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("Đề cần có tiêu đề");
  if (!draft.questions.length) errors.push("Đề cần ít nhất một câu hỏi");

  const keys = new Set<string>();
  draft.questions.forEach((q, i) => {
    const at = `Câu ${i + 1}`;
    if (!q.prompt.trim()) errors.push(`${at}: chưa có nội dung câu hỏi`);
    if (q.key && keys.has(q.key)) errors.push(`${at}: mã "${q.key}" bị trùng`);
    if (q.key) keys.add(q.key);

    if (q.type === "fill" || q.type === "output") {
      const list = (q.answer as string[]).filter((s) => String(s).trim());
      if (!list.length) errors.push(`${at}: chưa có đáp án`);
      return;
    }
    if (q.type !== "truefalse") {
      const opts = q.options.filter((o) => o.trim());
      if (opts.length < 2) errors.push(`${at}: cần ít nhất 2 phương án`);
    }
    const picked = q.answer as number[];
    if (!picked.length) errors.push(`${at}: chưa chọn đáp án đúng`);
    if (q.type === "single" && picked.length > 1) {
      errors.push(`${at}: câu một đáp án mà lại chọn nhiều`);
    }
  });
  return errors;
}

const TF_OPTIONS = ["Đúng", "Sai"];

export async function saveDraft(
  draft: Draft,
  ownerId: string,
  quizId: string | null
): Promise<string> {
  const sb = await getSupabase();
  if (!sb) throw new Error("chưa cấu hình Supabase");

  const head = {
    title: draft.title.trim(),
    lesson_path: draft.lessonPath.trim() || null,
    visibility: draft.visibility,
    pass_score: draft.passScore,
    source: "user" as const,
    owner_id: ownerId
  };

  let id = quizId;
  if (id) {
    const {error} = await sb.from("quizzes").update(head).eq("id", id);
    if (error) throw error;
    // Thay toàn bộ câu hỏi: đơn giản hơn hẳn so với so khớp từng câu, và
    // review_items của câu bị xoá cũng đi theo (ON DELETE CASCADE).
    const {error: delErr} = await sb.from("questions").delete().eq("quiz_id", id);
    if (delErr) throw delErr;
  } else {
    const {data, error} = await sb.from("quizzes").insert(head).select("id").single();
    if (error) throw error;
    id = data.id;
  }

  const rows = draft.questions.map((q, i) => {
    const isText = q.type === "fill" || q.type === "output";
    return {
      quiz_id: id,
      position: i,
      key: q.key.trim() || `c${i + 1}`,
      type: q.type,
      prompt: q.prompt.trim(),
      options: isText
        ? null
        : q.type === "truefalse"
          ? TF_OPTIONS
          : q.options.filter((o) => o.trim()),
      answer: isText
        ? (q.answer as string[]).map((s) => String(s).trim()).filter(Boolean)
        : q.answer,
      explanation: q.explanation.trim() || null,
      tags: q.tags,
      case_sensitive: q.caseSensitive
    };
  });

  const {error: insErr} = await sb.from("questions").insert(rows);
  if (insErr) throw insErr;
  return id!;
}

/** Nạp đề của chính mình để sửa — đáp án chỉ về qua RPC này. */
export async function loadDraft(quizId: string): Promise<{head: QuizRow; draft: Draft} | null> {
  const sb = await getSupabase();
  if (!sb) return null;

  const {data: head, error} = await sb
    .from("quizzes")
    .select("id, title, lesson_path, source, visibility, owner_id, pass_score, updated_at")
    .eq("id", quizId)
    .maybeSingle();
  if (error) throw error;
  if (!head) return null;

  const {data: qs, error: qErr} = await sb.rpc("quiz_for_edit", {p_quiz: quizId});
  if (qErr) throw qErr;

  return {
    head: head as QuizRow,
    draft: {
      title: head.title,
      lessonPath: head.lesson_path ?? "",
      visibility: head.visibility,
      passScore: head.pass_score,
      questions: (qs ?? []).map((q: any) => ({
        key: q.key ?? "",
        type: q.type,
        prompt: q.prompt,
        options: q.options ?? ["", ""],
        answer: q.answer,
        explanation: q.explanation ?? "",
        tags: q.tags ?? [],
        caseSensitive: Boolean(q.case_sensitive)
      }))
    }
  };
}

// ── Bảng xếp hạng ───────────────────────────────────────────────────────────

export type RankRow = {
  rank: number;
  user_id: string;
  display_name: string;
  /** Có ở bảng xếp hạng theo đề. */
  score?: number;
  correct_count?: number;
  question_count?: number;
  attempts?: number;
  achieved_at?: string;
  /** Có ở bảng xếp hạng chung. */
  quizzes_done?: number;
  total_correct?: number;
  total_questions?: number;
  avg_score?: number;
  last_at?: string;
};

/** Top N của một đề. Đọc được cả khi chưa đăng nhập. */
export async function leaderboard(quizId: string, limit = 20): Promise<RankRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const {data, error} = await sb.rpc("leaderboard", {p_quiz: quizId, p_limit: limit});
  if (error) throw error;
  return (data ?? []) as RankRow[];
}

/** Top N trên toàn bộ đề của site, xếp theo tổng số câu đúng. */
export async function leaderboardOverall(limit = 20): Promise<RankRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const {data, error} = await sb.rpc("leaderboard_overall", {p_limit: limit});
  if (error) throw error;
  return (data ?? []) as RankRow[];
}

export type MyRank = {rank: number; total: number} & Record<string, number>;

/**
 * Hạng của chính mình. Cần hàm riêng vì người ngoài top N không có trong danh
 * sách trên — mà đó lại đúng là người cần biết mình đang ở đâu.
 * Trả null khi chưa đăng nhập hoặc chưa làm bài nào.
 */
export async function myRank(quizId: string | null): Promise<MyRank | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const {data, error} = quizId
    ? await sb.rpc("my_rank", {p_quiz: quizId})
    : await sb.rpc("my_rank_overall");
  if (error) throw error;
  return (data?.[0] as MyRank) ?? null;
}

/** Tên hiện trên bảng xếp hạng. Rỗng thì quay về "Ẩn danh". */
export async function setDisplayName(userId: string, name: string) {
  const sb = await getSupabase();
  if (!sb) throw new Error("chưa cấu hình Supabase");
  const {error} = await sb
    .from("profiles")
    .update({display_name: name.trim() || null})
    .eq("id", userId);
  if (error) throw error;
}

export async function getDisplayName(userId: string): Promise<string> {
  const sb = await getSupabase();
  if (!sb) return "";
  const {data, error} = await sb
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.display_name ?? "";
}
