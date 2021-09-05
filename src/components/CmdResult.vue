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
        :class="file.slice(-1)[0] === '/' && 'purple--text'"
      >{{ file }}</div>
    </div>

    <img
      v-else-if="result.type === 'img'"
      :src="result.data"
      :alt="result.data.split('/').slice(-1)[0]"
    />

    <div
      v-if="result.type === 'history'"
      class="cmd-line__history"
    >
      <div
        v-for="(history, i) in result.data"
        :key="i"
      >
        <div class="cmd-line__history__index">{{ history[0] }}</div>
        <div>{{ history[1] }}</div>
      </div>
    </div>

    <a
      v-if="result.type === 'url'"
      :href="result.data"
      target="_blank"
      rel="noopener"
      class="blue--text"
    >{{ result.data }}</a>
  </div>
</template>

<style lang="scss" scoped>
.cmd-result {
  padding: 1px 6px;
  line-height: 1.5;
  font-size: 16px;
  font-family: 'Courier Prime', sans-serif;
  word-break: break-word;
  white-space: pre-wrap;

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
  .cmd-line__history {
    > div {
      display: flex;

      .cmd-line__history__index {
        min-width: 3rem;
        margin-right: 1rem;
        text-align: right;
      }
    }
  }
}
</style>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Result } from '@/tasoCli/shell';

export default defineComponent({
  name: 'CmdResult',
  props: {
    result: {
      type: Object as PropType<Result>
    }
  }
});
</script>
