import {defineConfig} from "vitepress";

// Head links KHÔNG được VitePress tự thêm tiền tố base, nên phải tự ghép.
// GitHub Pages là project site nên cần tiền tố "/learning-note/",
// còn Vercel serve ở root nên dùng "/".
const base = process.env.VERCEL ? "/" : "/learning-note/";

export default defineConfig({
  title: "NhatNT Notes",
  description:
    "Tài liệu học tập cá nhân — Linux, Database, Docker, JavaScript và nhiều hơn nữa",

  // GitHub Pages project site: https://zenny-12feb.github.io/learning-note/
  base,

  head: [
    ["link", {rel: "icon", type: "image/svg+xml", href: `${base}logo.svg`}],
    ["link", {rel: "apple-touch-icon", href: `${base}logo.svg`}],
    ["meta", {name: "theme-color", content: "#3c8772"}]
  ],

  themeConfig: {
    // Logo & site name
    logo: "/logo.svg",
    siteTitle: "NhatNT",

    // Search
    search: {
      provider: "local"
    },

    // Top navigation
    nav: [
      {text: "Home", link: "/"},
      {text: "Linux", link: "/notes/linux/"},
      {text: "Web", link: "/notes/web/"},
      {text: "Database", link: "/notes/database/"},
      {text: "Docker", link: "/notes/docker/"},
      {text: "JavaScript", link: "/notes/javascript/"},
      {text: "Cloud", link: "/notes/cloud/"}
    ],

    // Sidebar
    sidebar: {
      "/notes/linux/": [
        {
          text: "Linux",
          items: [
            {text: "Giới thiệu", link: "/notes/linux/"},
            {text: "Các lệnh cơ bản", link: "/notes/linux/basic-commands"},
            {text: "File System", link: "/notes/linux/file-system"},
            {text: "Permissions", link: "/notes/linux/permissions"},
            {text: "Process Management", link: "/notes/linux/processes"}
          ]
        }
      ],
      "/notes/web/": [
        {
          text: "HTML, DHTML & JavaScript",
          items: [
            {text: "Lộ trình", link: "/notes/web/"},
            {text: "Sân chơi tự do", link: "/notes/web/playground"}
          ]
        },
        {
          text: "Phần 1 — HTML",
          collapsed: false,
          items: [
            {
              text: "1. Giới thiệu & siêu liên kết",
              link: "/notes/web/01-html-va-sieu-lien-ket"
            },
            {
              text: "2. Thẻ cơ bản & hình ảnh",
              link: "/notes/web/02-the-co-ban-va-hinh-anh"
            },
            {
              text: "3. Bảng, tầng & multimedia",
              link: "/notes/web/03-bang-tang-multimedia"
            },
            {
              text: "4. Biểu mẫu & khung",
              link: "/notes/web/04-bieu-mau-va-khung"
            }
          ]
        },
        {
          text: "Phần 2 — DHTML & CSS",
          collapsed: false,
          items: [
            {
              text: "5. DHTML & Style Sheets",
              link: "/notes/web/05-dhtml-va-style-sheets"
            }
          ]
        },
        {
          text: "Phần 3 — JavaScript",
          collapsed: false,
          items: [
            {
              text: "6. Nền tảng cú pháp",
              link: "/notes/web/06-javascript-can-ban"
            },
            {
              text: "7. Các đối tượng cơ bản",
              link: "/notes/web/07-doi-tuong-co-ban"
            },
            {
              text: "8. Đối tượng trình duyệt",
              link: "/notes/web/08-doi-tuong-trinh-duyet"
            },
            {
              text: "9. Form & kiểm tra hợp lệ",
              link: "/notes/web/09-form-va-kiem-tra-hop-le"
            }
          ]
        }
      ],
      "/notes/database/": [
        {
          text: "Database",
          items: [
            {text: "Giới thiệu", link: "/notes/database/"},
            {text: "PostgreSQL", link: "/notes/database/postgresql"},
            {
              text: "PostgreSQL Advanced",
              link: "/notes/database/postgresql-advanced/"
            },
            {text: "MySQL", link: "/notes/database/mysql"},
            {text: "Redis", link: "/notes/database/redis"}
          ]
        }
      ],

      // Key cụ thể hơn nên sẽ thắng '/notes/database/' cho các trang trong đây.
      // Nhóm theo đúng các phase trong postgresql-advanced/index.md.
      "/notes/database/postgresql-advanced/": [
        {
          text: "← Database",
          link: "/notes/database/"
        },
        {
          text: "PostgreSQL Advanced",
          items: [
            {text: "Lộ trình", link: "/notes/database/postgresql-advanced/"}
          ]
        },
        {
          text: "Phase 1 — Internals",
          collapsed: false,
          items: [
            {
              text: "MVCC & Transactions",
              link: "/notes/database/postgresql-advanced/mvcc"
            },
            {
              text: "Locking & Concurrency",
              link: "/notes/database/postgresql-advanced/locking"
            },
            {
              text: "WAL & Checkpoint",
              link: "/notes/database/postgresql-advanced/wal"
            },
            {
              text: "VACUUM & Autovacuum",
              link: "/notes/database/postgresql-advanced/vacuum"
            },
            {
              text: "Storage",
              link: "/notes/database/postgresql-advanced/storage"
            }
          ]
        },
        {
          text: "Phase 2 — Indexing",
          collapsed: false,
          items: [
            {
              text: "B-tree Index",
              link: "/notes/database/postgresql-advanced/btree"
            },
            {
              text: "GIN / GiST / BRIN / Hash",
              link: "/notes/database/postgresql-advanced/index-types"
            },
            {
              text: "Partial & Expression Index",
              link: "/notes/database/postgresql-advanced/partial-expression-index"
            },
            {
              text: "Index Maintenance",
              link: "/notes/database/postgresql-advanced/index-maintenance"
            },
            {
              text: "pg_trgm",
              link: "/notes/database/postgresql-advanced/pg-trgm"
            }
          ]
        },
        {
          text: "Phase 3 — Query Planner",
          collapsed: false,
          items: [
            {
              text: "EXPLAIN ANALYZE",
              link: "/notes/database/postgresql-advanced/explain-analyze"
            }
          ]
        },
        {
          text: "Phase 4 — Scale",
          collapsed: false,
          items: [
            {
              text: "Partitioning",
              link: "/notes/database/postgresql-advanced/partitioning"
            },
            {
              text: "Bulk Loading",
              link: "/notes/database/postgresql-advanced/bulk-loading"
            },
            {
              text: "Time-series Patterns",
              link: "/notes/database/postgresql-advanced/time-series"
            }
          ]
        },
        {
          text: "Phase 5 — Operations",
          collapsed: false,
          items: [
            {
              text: "Replication",
              link: "/notes/database/postgresql-advanced/replication"
            },
            {
              text: "Connection Pooling",
              link: "/notes/database/postgresql-advanced/connection-pooling"
            },
            {
              text: "Config Tuning",
              link: "/notes/database/postgresql-advanced/config-tuning"
            },
            {
              text: "Sharding",
              link: "/notes/database/postgresql-advanced/sharding"
            },
            {
              text: "Zero-downtime Migration",
              link: "/notes/database/postgresql-advanced/zero-downtime-migration"
            }
          ]
        },
        {
          text: "Schema & Labs",
          collapsed: false,
          items: [
            {
              text: "Schema Design",
              link: "/notes/database/postgresql-advanced/schema"
            },
            {text: "Labs", link: "/notes/database/postgresql-advanced/labs"}
          ]
        }
      ],
      "/notes/cloud/": [
        {
          text: "Cloud / AWS",
          items: [{text: "Lộ trình", link: "/notes/cloud/"}]
        },
        {
          text: "Nền tảng",
          collapsed: false,
          items: [
            {text: "IAM", link: "/notes/cloud/iam"},
            {text: "EC2 — Cơ bản", link: "/notes/cloud/ec2-basic"},
            {text: "EC2 — Nâng cao", link: "/notes/cloud/ec2-associate"},
            {
              text: "EC2 — Instance Storage",
              link: "/notes/cloud/ec2-instance-storage"
            },
            {
              text: "EC2 — HA & Scalability",
              link: "/notes/cloud/ec2-high-availability"
            }
          ]
        },
        {
          text: "Lưu trữ",
          collapsed: false,
          items: [
            {text: "S3 — Giới thiệu", link: "/notes/cloud/s3-introduction"},
            {text: "S3 — Nâng cao", link: "/notes/cloud/s3-advanced"},
            {text: "S3 — Bảo mật", link: "/notes/cloud/s3-security"},
            {text: "CloudFront & GA", link: "/notes/cloud/cloudfront"},
            {text: "Storage Extras", link: "/notes/cloud/storage-extras"}
          ]
        },
        {
          text: "Database & Network",
          collapsed: false,
          items: [
            {
              text: "RDS, Aurora & ElastiCache",
              link: "/notes/cloud/rds-aurora-elasticache"
            },
            {text: "Databases in AWS", link: "/notes/cloud/databases-in-aws"},
            {text: "Route 53", link: "/notes/cloud/route53"}
          ]
        },
        {
          text: "Kiến trúc & Tích hợp",
          collapsed: false,
          items: [
            {
              text: "Classic Architecture",
              link: "/notes/cloud/classic-architecture"
            },
            {
              text: "Integration & Messaging",
              link: "/notes/cloud/integration-messaging"
            },
            {text: "Containers on AWS", link: "/notes/cloud/containers"}
          ]
        },
        {
          text: "Serverless",
          collapsed: false,
          items: [
            {text: "Lambda", link: "/notes/cloud/serverless-lambda"},
            {text: "DynamoDB", link: "/notes/cloud/serverless-dynamodb"},
            {
              text: "API Gateway & Cognito",
              link: "/notes/cloud/serverless-api-gateway-cognito"
            },
            {
              text: "Serverless Architectures",
              link: "/notes/cloud/serverless-architectures"
            }
          ]
        },
        {
          text: "Data & ML",
          collapsed: false,
          items: [
            {text: "Data & Analytics", link: "/notes/cloud/data-analytics"},
            {text: "Machine Learning", link: "/notes/cloud/machine-learning"}
          ]
        }
      ],
      "/notes/docker/": [
        {
          text: "Docker",
          items: [
            {text: "Giới thiệu", link: "/notes/docker/"},
            {text: "Dockerfile", link: "/notes/docker/dockerfile"},
            {text: "Docker Compose", link: "/notes/docker/docker-compose"},
            {text: "Networking", link: "/notes/docker/networking"}
          ]
        }
      ],
      "/notes/javascript/": [
        {
          text: "JavaScript",
          items: [
            {text: "Giới thiệu", link: "/notes/javascript/"},
            {text: "ES6+ Features", link: "/notes/javascript/es6"},
            {text: "Async / Await", link: "/notes/javascript/async"},
            {text: "Node.js", link: "/notes/javascript/nodejs"}
          ]
        }
      ]
    },

    // Social links
    socialLinks: [
      {icon: "github", link: "https://github.com/zenny-12Feb/learning-note"}
    ],

    // Footer
    footer: {
      message: "Personal learning notes",
      copyright: "Copyright © 2026 nhatnt"
    },

    // Edit link (optional — nếu dùng GitHub)
    // editLink: {
    //   pattern: 'https://github.com/username/learning-note/edit/main/:path',
    //   text: 'Edit this page on GitHub'
    // },

    // Last updated
    lastUpdated: {
      text: "Cập nhật lần cuối",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "short"
      }
    }
  },

  // Markdown options
  markdown: {
    lineNumbers: true,
    theme: {
      light: "github-light",
      dark: "github-dark"
    }
  },

  // Last updated
  lastUpdated: true
});
