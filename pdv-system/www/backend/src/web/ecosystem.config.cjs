module.exports = {
  apps: [
    {
      name: 'backend',
      script: '/app/Back-End.js',
      watch: true,
      watch_options: {
        followSymlinks: false,
        usePolling: true,
        interval: 500,
      },
      ignore_watch: [
        'node_modules',
        'logs',
        '*.sqlite',
        '*.sqlite-journal',
        '.git'
      ],
      watch_delay: 10000,
    },
  ],
};