<script setup lang="ts">
import { ref } from "vue"
import Button from "./components/ui/Button.vue"

const count = ref(0)
</script>

<template>
  <main class="min-h-screen bg-canvas px-6 py-16 text-ink">
    <section class="mx-auto max-w-lg rounded-2xl bg-surface p-8 shadow-sm">
      <p class="text-sm font-medium text-primary">selfix playground</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">Small app. Consistent styles.</h1>
      <p class="mt-4 leading-relaxed text-muted">
        A Vue component, semantic theme colors, and a button that owns its appearance.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <Button @click="count++">Count: {{ count }}</Button>
        <Button variant="secondary" @click="count = 0">Reset</Button>
      </div>
      <p class="mt-4 text-sm text-muted" aria-live="polite">Clicked {{ count }} times.</p>
    </section>
  </main>
</template>
