import DefaultTheme from "vitepress/theme";
import CodePlayground from "./components/CodePlayground.vue";
import Quiz from "./components/Quiz.vue";
import QuizHub from "./components/QuizHub.vue";
import Leaderboard from "./components/Leaderboard.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({app}) {
    app.component("CodePlayground", CodePlayground);
    app.component("Quiz", Quiz);
    app.component("QuizHub", QuizHub);
    app.component("Leaderboard", Leaderboard);
  }
};
