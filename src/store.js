import Vue from 'vue';
import Vuex from 'vuex';

const THREE = require("three");

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    maxFps: 60,
    fps: 0,
    LEDs: {},
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(50, 1, 1, 99999),
    activeObjects: {},
    ports: [],
    activePort: null,
    activeTool: 'select',
    line: null,
    lineGeometry: new THREE.BufferGeometry(),
    lineConnections: [],
    maxConnections: 512,
    mode: 'design',
    objects: [],
    animations: [],
    snapToGrid: false,
    showHelpers: true,
    activeLEDMaterial: null,
    bufferRenderer: new THREE.WebGLRenderer({ premultipliedAlpha: false }),
    bufferCamera: null,
    bufferScene: new THREE.Scene(),
    bufferTexture: null,
    bufferWidth: 4,
    bufferHeight: 4,
    bufferMaterial: null,
    bufferGeometry: null,
    bufferObject: null,
    buffer: null,
    shiftPressed: false,
    selectionGroup: new THREE.Group()
  },
  mutations: {
    addLED: function (state, options = { position: [0, 0, 0] }) {
      let geometry = new THREE.OctahedronBufferGeometry(5, 0);
      let material = state.activeLEDMaterial;
      let mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(options.position[0], options.position[1], options.position[2]);
      mesh.userData.type = 'LED';
      state.scene.add(mesh);
      Vue.set(state.LEDs, mesh.uuid, {
        position: options.position
      });
      state.lineConnections.push(mesh.uuid);
      state.line.geometry.setDrawRange(0, state.lineConnections.length);

      this.commit("clearActiveObjects");
      this.commit("addActiveObject", mesh.uuid);
      this.commit("updateLEDConnections", [mesh]);

      /*
      if (state.activePort) {
        let n = Object.keys(state.LEDs).length;
        state.activePort.write(
          Buffer.from('count,' + n + '\n', 'utf8')
        );
      }
      */
    },
    addObject: function (state, options = { mesh: null, position: [0, 0, 0] }) {
      let object = {
        uuid: options.mesh.uuid,
        position: options.position
      };

      if (options.name) object.name = options.name;
      options.mesh.position.set(options.position[0], options.position[1], options.position[2]);
      options.mesh.userData.type = 'Object';
      state.scene.add(options.mesh);
      state.objects.push(object);
      this.commit("clearActiveObjects");
      this.commit("addActiveObject", options.mesh.uuid);
    },
    addAnimation: function (state) {
      let animation = new THREE.Object3D();

      animation.userData.type = 'Animation';
      animation.visble = false;
      state.scene.add(animation);
      state.animations.push({
        uuid: animation.uuid,
        effects: []
      });
      this.commit("clearActiveObjects");
      this.commit("addActiveObject", animation.uuid);
    },
    addBox: function (state, options = { size: [10, 10, 10], position: [0, 0, 0] }) {
      let geometry = new THREE.BoxBufferGeometry(options.size[0], options.size[1], options.size[2]);
      let material = new THREE.MeshPhongMaterial({ color: 0xDDDDDD });
      let mesh = new THREE.Mesh(geometry, material);

      this.commit('addObject', { mesh, position: options.position, name: 'Box' });
    },
    addPlane: function (state, options = { size: [30, 30], position: [0, 0, 0] }) {
      let geometry = new THREE.PlaneBufferGeometry(options.size[0], options.size[1]);
      let material = new THREE.MeshPhongMaterial({ color: 0xDDDDDD, side: THREE.DoubleSide });
      let mesh = new THREE.Mesh(geometry, material);

      this.commit('addObject', { mesh, position: options.position, name: 'Plane' });
    },
    addGroup: function (state, options) {
      let object = {
        uuid: options.group.uuid,
        position: options.position
      };

      if (options.name) object.name = options.name;
      options.group.userData.type = 'Group';
      state.scene.add(options.group);
      state.objects.push(object);
      this.commit("clearActiveObjects");
      this.commit("addActiveObject", options.group.uuid);
    },
    addPort: function (state, port) {
      state.ports.push(port);
    },
    updateObjectName: function (state, updates) {
      let threeObject = state.scene.getObjectByProperty('uuid', updates.uuid);
      let type = threeObject.userData.type;

      threeObject.userData.name = updates.name;

      if (type == 'LED') {
        let index = updates.uuid;
        let newAttributes = Object.assign({}, state.LEDs[index]);

        newAttributes.name = updates.name;
        Vue.set(state.LEDs, index, newAttributes);
      } else if (type == 'Animation') {
        let index = state.animations.findIndex((elem) => elem.uuid == updates.uuid);
        let newAttributes = Object.assign({}, state.animations[index]);

        newAttributes.name = updates.name;
        Vue.set(state.animations, index, newAttributes);
      } else {
        let index = state.objects.findIndex((elem) => elem.uuid == updates.uuid);
        let newAttributes = Object.assign({}, state.objects[index]);

        newAttributes.name = updates.name;
        Vue.set(state.objects, index, newAttributes);
      }
    },
    updateLEDConnections: function (state, objects) {
      objects.forEach(object => {
        if (object.userData.type !== 'LED') return;

        let index = state.lineConnections.indexOf(object.uuid);
        let position = new THREE.Vector3();

        object.getWorldPosition(position);
        state.line.geometry.attributes.position.array[index * 3] = position.x;
        state.line.geometry.attributes.position.array[index * 3 + 1] = position.y;
        state.line.geometry.attributes.position.array[index * 3 + 2] = position.z;
        state.line.geometry.attributes.position.needsUpdate = true;
      });
    },
    deleteObject(state, object) {
      if (object.userData.type == 'LED') {
        Vue.delete(state.LEDs, object.uuid);
      } else {
        let index = state.objects.findIndex((elem) => elem.uuid == object.uuid);
        state.objects.splice(index, 1);
      }
      state.scene.remove(object);
    },
    setActivePort(state, port) {
      state.activePort = port;
    },
    setActiveTool: function (state, tool) {
      state.activeTool = tool;
    },
    addActiveObject(state, uuid) {
      let newActiveObjects = Object.assign({}, state.activeObjects);
      newActiveObjects[uuid] = true;
      state.activeObjects = newActiveObjects;
    },
    clearActiveObjects(state) {
      state.activeObjects = {};
    },
    setFps: function (state, fps) {
      state.fps = fps;
    },
    setMaxFps: function (state, maxFps) {
      state.maxFps = maxFps;
    },
    setMode: function (state, mode) {
      state.mode = mode;
    },
    setShiftPressed: function (state, bool) {
      state.shiftPressed = bool;
    },
    toggleSnapToGrid: function (state) {
      state.snapToGrid = !state.snapToGrid;
    },
    toggleShowHelpers: function (state) {
      state.showHelpers = !state.showHelpers;
    },
    emptySelectionGroup: function (state) {
      let group = state.selectionGroup.children;

      for (var i = group.length - 1; i >= 0; i--) {
        let child = group[i];

        child.applyMatrix(state.selectionGroup.matrixWorld);
        state.selectionGroup.remove(child);
        state.scene.add(child);
      }

      state.selectionGroup.position.set(0, 0, 0);
      state.selectionGroup.rotation.set(0, 0, 0);
      state.selectionGroup.scale.set(1, 1, 1);
      state.selectionGroup.updateMatrix();
    },
    deleteActiveObjects: function (state) {
      this.commit("emptySelectionGroup");
      for (const uuid in state.activeObjects) {
        this.commit("deleteObject", state.scene.getObjectByProperty("uuid", uuid));
      }
      this.commit("clearActiveObjects");
    },
    applyLEDMaterial: function (state) {
      let uniforms = { time: new THREE.Uniform(0.0) };
      let shaderParameters = "";
      let shader = "";
      let activeAnimation = null;

      if (Object.keys(state.activeObjects).length == 1) {
        let activeObjectUuid = Object.keys(state.activeObjects)[0];

        activeAnimation = state.animations.find(
          animation => animation.uuid == activeObjectUuid
        );
      }

      if (activeAnimation) {
        activeAnimation.effects.forEach(effect => {
          uniforms = THREE.UniformsUtils.merge([uniforms, effect.properties]);
          shaderParameters += "\n" + effect.shaderParameters;
          shader += "\n" + effect.shader;
        });
      }

      let material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: [
          "uniform float time;",
          "varying lowp vec4 vColor;",
          "attribute vec3 LEDPosition;",
          "attribute float LEDIndex;",
          "float random(in vec2 st){ return fract(sin(dot(st.xy ,vec2(12.9898,78.233))) * 43758.5453); }",
          shaderParameters,
          "void main() {",
          "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
          "vColor = vec4(0.0);",
          shader,
          "}"
        ].join("\n"),
        fragmentShader: [
          "varying lowp vec4 vColor;",
          "void main() {",
          "gl_FragColor = vColor;",
          "}"
        ].join("\n")
      });

      state.bufferMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([uniforms, {
          width: { value: state.bufferWidth },
          height: { value: state.bufferHeight }
        }]),
        vertexShader: [
          "attribute float LEDIndex;",
          "attribute vec3 LEDPosition;",
          "uniform float time;",
          "uniform float width;",
          "uniform float height;",
          "varying vec4 vColor;",
          "float random(in vec2 st){ return fract(sin(dot(st.xy ,vec2(12.9898,78.233))) * 43758.5453); }",
          shaderParameters,
          "void main() {",
          "  vec2 pos = vec2(mod(LEDIndex, width) / width, floor(LEDIndex / width) / height) * 2.0 - 1.0;",
          "  pos += 1.0 / width;",
          "  gl_PointSize = 1.0;",
          "  gl_Position = vec4(pos, 0.0, 1.0);",
          "  vColor = vec4(0.0);",
          shader,
          "}",
        ].join("\n"),
        fragmentShader: [
          "varying vec4 vColor;",
          "void main() {",
          "  gl_FragColor = vColor;",
          "}",
        ].join("\n")
      });

      let index = 0;
      for (let LED in state.LEDs) {
        let object = state.scene.getObjectByProperty("uuid", LED);
        let LEDPosition = Float32Array.from(object.geometry.attributes.position.array);
        let length = object.geometry.attributes.position.array.length / 3;
        let LEDIndex = Float32Array.from({ length: length }, () => index);

        for (var i = 0; i < LEDPosition.length; i += 3) {
          LEDPosition[i] = object.position.x;
          LEDPosition[i + 1] = object.position.y;
          LEDPosition[i + 2] = object.position.z;
        }
        object.geometry.addAttribute('LEDPosition', new THREE.BufferAttribute(LEDPosition, 3));
        object.geometry.addAttribute('LEDIndex', new THREE.BufferAttribute(LEDIndex, 1));
        object.material = material;
        object.needsUpdate = true;
        state.bufferGeometry.attributes.LEDPosition.array[index * 3] = object.position.x;
        state.bufferGeometry.attributes.LEDPosition.array[index * 3 + 1] = object.position.y;
        state.bufferGeometry.attributes.LEDPosition.array[index * 3 + 2] = object.position.z;
        index++;
      }

      if (state.bufferObject) {
        state.bufferObject.material = state.bufferMaterial;
        state.bufferObject.needsUpdate = true;
        state.bufferGeometry.attributes.LEDPosition.needsUpdate = true;
      }

      state.activeLEDMaterial = material;
    }
  },
  actions: {

  }
})
