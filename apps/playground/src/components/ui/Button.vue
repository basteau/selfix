<script setup lang="ts">
withDefaults(defineProps<{ variant?: "primary" | "secondary" }>(), { variant: "primary" })
</script>

<template>
  <button
    type="button"
    class="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :class="variant === 'primary' ? 'bg-primary text-on-primary' : 'bg-canvas text-ink'"
  >
    <slot />
  </button>
</template>
