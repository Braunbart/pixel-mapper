<template>
  <div>
    <div class="form-element">
      <label>Color:</label>
      <input
        type="color"
        v-bind:value="color"
        v-on:input="apply('color', $event.target.value, hexToThreeColor)"
      >
    </div>
    <div class="form-element">
      <label>Speed:</label>
      <input
        type="range"
        v-bind:value="speed"
        v-on:input="apply('speed', $event.target.value)"
        min="0.5"
        max="7.0"
        step="0.1"
      >
    </div>
  </div>
</template>

<script>
import Default from "./Default.vue";

export default {
  name: "Alternating",
  mixins: [Default],
  data() {
    return {
      color:
        "#" +
        new THREE.Color(
          this.properties["color"].value.x,
          this.properties["color"].value.y,
          this.properties["color"].value.z
        ).getHexString(),
      speed: this.properties["speed"].value
    };
  },
  methods: {
    hexToThreeColor: function(color) {
      let threeColor = new THREE.Color(color);
      return new THREE.Vector3(threeColor.r, threeColor.g, threeColor.b);
    }
  }
};
</script>
