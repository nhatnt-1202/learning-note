import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Learning Notes",
  description: "Tài liệu học tập cá nhân — Linux, Database, Docker, JavaScript và nhiều hơn nữa",

  // GitHub Pages project site: https://zenny-12feb.github.io/learning-note/
  base: '/learning-note/',

  // ./labs được link trong postgresql-advanced/index.md nhưng chưa viết.
  // Chỉ bỏ qua đúng slug này, các link sai khác vẫn làm build fail.
  ignoreDeadLinks: [
    /\/labs$/,
  ],

  themeConfig: {
    // Logo & site name
    logo: '/logo.svg',
    siteTitle: 'Notes',

    // Search
    search: {
      provider: 'local'
    },

    // Top navigation
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Linux', link: '/notes/linux/' },
      { text: 'Database', link: '/notes/database/' },
      { text: 'Docker', link: '/notes/docker/' },
      { text: 'JavaScript', link: '/notes/javascript/' },
    ],

    // Sidebar
    sidebar: {
      '/notes/linux/': [
        {
          text: 'Linux',
          items: [
            { text: 'Giới thiệu', link: '/notes/linux/' },
            { text: 'Các lệnh cơ bản', link: '/notes/linux/basic-commands' },
            { text: 'File System', link: '/notes/linux/file-system' },
            { text: 'Permissions', link: '/notes/linux/permissions' },
            { text: 'Process Management', link: '/notes/linux/processes' },
          ]
        }
      ],
      '/notes/database/': [
        {
          text: 'Database',
          items: [
            { text: 'Giới thiệu', link: '/notes/database/' },
            { text: 'PostgreSQL', link: '/notes/database/postgresql' },
            { text: 'PostgreSQL Advanced', link: '/notes/database/postgresql-advanced/' },
            { text: 'MySQL', link: '/notes/database/mysql' },
            { text: 'Redis', link: '/notes/database/redis' },
          ]
        }
      ],

      // Key cụ thể hơn nên sẽ thắng '/notes/database/' cho các trang trong đây.
      // Nhóm theo đúng các phase trong postgresql-advanced/index.md.
      '/notes/database/postgresql-advanced/': [
        {
          text: '← Database',
          link: '/notes/database/'
        },
        {
          text: 'PostgreSQL Advanced',
          items: [
            { text: 'Lộ trình', link: '/notes/database/postgresql-advanced/' },
          ]
        },
        {
          text: 'Phase 1 — Internals',
          collapsed: false,
          items: [
            { text: 'MVCC & Transactions', link: '/notes/database/postgresql-advanced/mvcc' },
            { text: 'Locking & Concurrency', link: '/notes/database/postgresql-advanced/locking' },
            { text: 'WAL & Checkpoint', link: '/notes/database/postgresql-advanced/wal' },
            { text: 'VACUUM & Autovacuum', link: '/notes/database/postgresql-advanced/vacuum' },
            { text: 'Storage', link: '/notes/database/postgresql-advanced/storage' },
          ]
        },
        {
          text: 'Phase 2 — Indexing',
          collapsed: false,
          items: [
            { text: 'B-tree Index', link: '/notes/database/postgresql-advanced/btree' },
            { text: 'GIN / GiST / BRIN / Hash', link: '/notes/database/postgresql-advanced/index-types' },
            { text: 'Partial & Expression Index', link: '/notes/database/postgresql-advanced/partial-expression-index' },
            { text: 'Index Maintenance', link: '/notes/database/postgresql-advanced/index-maintenance' },
            { text: 'pg_trgm', link: '/notes/database/postgresql-advanced/pg-trgm' },
          ]
        },
        {
          text: 'Phase 3 — Query Planner',
          collapsed: false,
          items: [
            { text: 'EXPLAIN ANALYZE', link: '/notes/database/postgresql-advanced/explain-analyze' },
          ]
        },
      ],
      '/notes/docker/': [
        {
          text: 'Docker',
          items: [
            { text: 'Giới thiệu', link: '/notes/docker/' },
            { text: 'Dockerfile', link: '/notes/docker/dockerfile' },
            { text: 'Docker Compose', link: '/notes/docker/docker-compose' },
            { text: 'Networking', link: '/notes/docker/networking' },
          ]
        }
      ],
      '/notes/javascript/': [
        {
          text: 'JavaScript',
          items: [
            { text: 'Giới thiệu', link: '/notes/javascript/' },
            { text: 'ES6+ Features', link: '/notes/javascript/es6' },
            { text: 'Async / Await', link: '/notes/javascript/async' },
            { text: 'Node.js', link: '/notes/javascript/nodejs' },
          ]
        }
      ],
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/zenny-12Feb/learning-note' }
    ],

    // Footer
    footer: {
      message: 'Personal learning notes',
      copyright: 'Copyright © 2024 nhatnt'
    },

    // Edit link (optional — nếu dùng GitHub)
    // editLink: {
    //   pattern: 'https://github.com/username/learning-note/edit/main/:path',
    //   text: 'Edit this page on GitHub'
    // },

    // Last updated
    lastUpdated: {
      text: 'Cập nhật lần cuối',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  },

  // Markdown options
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },

  // Last updated
  lastUpdated: true,
})
