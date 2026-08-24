<script setup lang="ts">
import { provideProgressRepository } from '@/progress/context'

import AppShell from './app-shell/AppShell.vue'

provideProgressRepository()
</script>

<template>
  <AppShell />
</template>
