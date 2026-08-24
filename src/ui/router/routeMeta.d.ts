import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    showBack?: boolean
    backTo?: string
  }
}
