<template>
  <div class="cmd-result">
    <span
      v-if="result.type === 'text'"
      class="cmd-line__text"
    >{{ result.data }}</span>

    <div
      v-if="result.type === 'files'"
      class="cmd-line__files"
    >
      <div
        v-for="(file, i) in result.data"
        :key="i"
        :class="file.slice(-1)[0] === '/' && 'blue--text'"
      >{{ file }}</div>
    </div>

    <img
      v-else-if="result.type === 'img'"
      :src="result.data"
    />
  </div>
</template>

<style lang="scss" scoped>
.cmd-result {
  padding: 1px 6px;
  line-height: 1.5;
  font-size: 16px;
  font-family: 'Courier Prime', sans-serif;
  word-break: break-word;
  white-space: pre-line;

  ::selection {
    background: #fce300 !important;
  }
  span {
    vertical-align: middle;
  }
  .cmd-line__files {
    > div {
      display: inline-block;
      margin-right: 3rem;
    }
  }
  img {
    max-width: 300px;
    max-height: 300px;
  }
}
</style>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CmdResult',
  props: {
    result: {
      type: Object
    }
  }
});
</script>
