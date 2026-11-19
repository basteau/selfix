<script setup lang="ts">
import { ref } from "vue"

const count = ref(0)
</script>

<template>
  <UApp>
    <main class="min-h-screen bg-muted px-6 py-16">
      <UCard class="mx-auto max-w-lg" :ui="{ body: 'space-y-4' }">
        <template #header>
          <p class="text-sm font-medium text-primary">selfix playground</p>
          <h1 class="mt-2 text-2xl font-semibold text-highlighted">
            Small app. Consistent styles.
          </h1>
        </template>
        <p class="text-muted">
          Nuxt UI components, semantic theme colors, and a button that owns its appearance.
        </p>
        <div class="flex flex-wrap gap-3">
          <UButton @click="count++">Count: {{ count }}</UButton>
          <UButton color="neutral" variant="outline" @click="count = 0">Reset</UButton>
        </div>
        <p class="text-sm text-muted" aria-live="polite">Clicked {{ count }} times.</p>
      </UCard>
    </main>
  </UApp>
</template>
