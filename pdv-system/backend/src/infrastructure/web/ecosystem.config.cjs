module.exports = {
  apps: [{
    name: 'backend',
    script: '/home/grasnik/Desktop/Caixa/Private/Back-End.js',

    watch: true,
    watch: ['/home/grasnik/Desktop/Caixa/Private/'],
    ignore_watch: ['/home/grasnik/Desktop/Caixa/Private/tokens.json'],
    
    watch_options: {usePolling: true}
  }]
};