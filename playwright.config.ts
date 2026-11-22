import {defineConfig,devices} from '@playwright/test'
export default defineConfig({
 testDir:'./tests/browser',timeout:60000,workers:2,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4173/leap_robot/',timezoneId:'Asia/Tokyo'},
 projects:[{name:'chromium',use:{...devices['Pixel 7'],defaultBrowserType:'chromium'}},{name:'webkit',use:{...devices['iPhone 13'],defaultBrowserType:'webkit'}}],
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173/leap_robot/',reuseExistingServer:!process.env.CI}
})
