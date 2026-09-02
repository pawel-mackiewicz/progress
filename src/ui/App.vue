<script setup lang="ts">
import { provideProgressServices } from '@/progress/context'

import AppShell from './app-shell/AppShell.vue'

provideProgressServices()
</script>

<template>
  <AppShell />
</template>
