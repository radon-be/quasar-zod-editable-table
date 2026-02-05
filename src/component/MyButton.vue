<template>
  <q-btn color="primary" label="My Button" @click="onClick" />
</template>

<script lang="ts">
  import { defineComponent } from 'vue';

  export default defineComponent({
    name: 'MyButton',
    setup() {
      const onClick = () => {
        console.log('Button click-clacked!');
      };

      return {
        onClick
      };
    }
  });
</script>
