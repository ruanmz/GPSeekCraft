import os from 'node:os'

// 自动收集本机所有 LAN IPv4 地址，配置为 allowedDevOrigins
// 修复 iPad/iPhone 通过局域网访问 dev 服务器时 Next.js 16.2.x 在 iOS Safari 上 hydration 失败、onClick 不触发的问题
// 详见 https://github.com/vercel/next.js/issues/91908
function getLanOrigins() {
  const ifaces = os.networkInterfaces()
  const origins = []
  for (const list of Object.values(ifaces)) {
    if (!list) continue
    for (const iface of list) {
      if (iface.family === 'IPv4' && !iface.internal) {
        origins.push(`http://${iface.address}:3000`)
      }
    }
  }
  return origins
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // iPad/iPhone 通过 LAN 访问 dev 服务器时必须配置，否则 iOS Safari 上 React 不 hydrate、事件不触发
  allowedDevOrigins: getLanOrigins(),
}

export default nextConfig
