import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'FetchMoji',
    description: 'Find and copy the right emoji from a phrase you type.',
    permissions: ['clipboardWrite'],
    action: {
      default_title: 'Search FetchMoji',
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+E',
          mac: 'Command+Shift+E',
        },
        description: 'Open FetchMoji search',
      },
    },
  },
})
