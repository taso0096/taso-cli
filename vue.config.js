// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GenerateSW } = require('workbox-webpack-plugin');

const cacheId = 'taso-cli';

module.exports = {
  pwa: {
    name: 'taso-cli',
    themeColor: '#000',
    msTileColor: '#000',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
    manifestOptions: {
      lang: 'ja-jp',
      description: 'This is taso0096\'s portfolio.\nEnjoy the CLI simulation!',
      background_color: '#000',
      display: 'standalone',
      Scope: '/',
      start_url: '/',
      icons: [
        {
          src: 'img/icons/manifest-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable any'
        },
        {
          src: 'img/icons/manifest-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable any'
        }
      ]
    },
    iconPaths: {
      appleTouchIcon: null,
      maskIcon: null,
      msTileImage: null
    },
    workboxPluginMode: 'GenerateSW',
    workboxOptions: {}
  },
  configureWebpack: config => {
    config.plugins.push(
      new GenerateSW({
        cacheId,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /https:\/\/fonts.googleapis.com\/.*/,
            handler: 'networkFirst',
            options: {
              cacheName: `${cacheId}-fonts`,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60*60*24*30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      })
    );
  }
};
