import fs from 'fs'
import path from 'path'

const files = [
  'src/pages/CassaPage.jsx',
  'src/pages/OrdersPage.jsx',
  'src/pages/ProductsPage.jsx',
  'src/pages/AnalyticsPage.jsx',
  'src/pages/ChannelsPage.jsx',
  'src/pages/UsersPage.jsx',
  'src/pages/SettingsPage.jsx',
  'src/pages/PlanPage.jsx',
  'src/pages/OrderDetailPage.jsx',
  'src/pages/StaffDashboard.jsx'
]

const basePath = 'C:\\Users\\ACER\\Desktop\\Progetti MVP Menu\\mvpmenu\\'

files.forEach(file => {
  const filePath = path.join(basePath, file)

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skip: ${file} (not found)`)
    return
  }

  let content = fs.readFileSync(filePath, 'utf8')

  // Check if already has permissions
  if (content.includes('permissions={')) {
    console.log(`✅ Already fixed: ${file}`)
    return
  }

  // Replace patterns
  const patterns = [
    {
      // Pattern 1: isPremium without permissions
      from: /isPremium=\{[^}]+\}\s*\n\s*onLogout=/g,
      to: (match) => match.replace('onLogout=', 'permissions={[\'*\']}\n        onLogout=')
    },
    {
      // Pattern 2: isPremium at end of props
      from: /isPremium=\{[^}]+\}\s*>/g,
      to: (match) => match.replace('>', '\n        permissions={[\'*\']}\n      >')
    }
  ]

  let modified = false
  patterns.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to)
      modified = true
    }
  })

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ Fixed: ${file}`)
  } else {
    console.log(`⚠️  Pattern not found in: ${file}`)
  }
})

console.log('\n🎉 Done!')
