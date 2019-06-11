import Vue from 'vue';
import Vuex from 'vuex';
import persistence from './modules/persistence.js';
import connections from './modules/connections.js';
import masks from './modules/masks.js';
import selection from './modules/selection.js';
import objects from './modules/objects.js';
import leds from './modules/leds.js';
import animations from './modules/animations';
import output from './modules/output';
import buffer from './modules/buffer';
import transformUtil from "../utils/transform.js";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    maxFps: 61,
    fps: 0,
    renderer: new THREE.WebGLRenderer(),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(50, 1, 1, 99999),
    orbitControl: null,
    transformControl: null,
    transformDummy: new THREE.Object3D(),
    activeElements: {},
    activeTool: 'move',
    mode: 'design',
    snapToGrid: false,
    ctrlPressed: false,
    leftAnimation: null,
    rightAnimation: null,
    mixValue: 0.5,
    globalOpacity: 1.0,
  },
  modules: {
    persistence,
    connections,
    masks,
    selection,
    objects,
    animations,
    leds,
    output,
    buffer
  },
  getters: {
    activeObject: state => {
      if (state.selection.selectionGroup.length > 1) {
        return state.transformDummy;
      }
      return state.selection.selectionGroup[0];
    },
    canMove: state => {
      return transformUtil.canActiveObjectTraslate(state, 'move');
    },
    canRotate: state => {
      return transformUtil.canActiveObjectTraslate(state, 'rotate');
    },
    canScale: state => {
      return transformUtil.canActiveObjectTraslate(state, 'scale');
    },
  },
  mutations: {
    addGroup: function (state, options) {
      let group = new THREE.Group();
      let i = options.children.length;
      let center = transformUtil.getCenter(options.children);

      group.position.copy(center);
      while (i--) {
        options.children[i].position.sub(center)
        group.add(options.children[i]);
      }
      if (options.name) group.name = options.name;
      if (options.uuid) group.uuid = options.uuid;
      if (options.position) group.position.copy(options.position);
      if (options.rotation) group.rotation.copy(options.rotation);
      if (options.scale) group.scale.copy(options.scale);
      group.userData.type = 'Group';
      group.userData.groupType = options.groupType;
      state.scene.add(group);

      setTimeout(() => this.dispatch('updateLEDConnections', options.children), 1);
      this.commit("clearActiveElements");
      this.commit("addActiveElement", group.uuid);
    },
    updateElementName: function (state, updates) {
      let threeObject = state.scene.getObjectByProperty('uuid', updates.uuid);
      threeObject.name = updates.name;
    },
    deleteElement(state, element) {
      if (element.userData.type == 'LED') {
        this.dispatch("disconnectBoth", element);
      } else if (element.userData.groupType == 'LED') {
        element.children.forEach(child => {
          this.dispatch("disconnectBoth", child);
        });
      } else if (element.userData.type == 'Animation') {
        let index = state.animations.animations.findIndex((elem) => elem.uuid == element.uuid);
        state.animations.animations.splice(index, 1);
      }
      state.selection.selectionScene.remove(element.userData.clone);
      element.parent.remove(element);
    },
    addActiveElement(state, uuid) {
      Vue.set(state.activeElements, uuid, true);
      this.dispatch("addToSelectionGroup", uuid);
    },
    removeActiveElement(state, uuid) {
      Vue.delete(state.activeElements, uuid);
      this.dispatch("removeFromSelectionGroup", uuid);
    },
    clearActiveElements(state) {
      state.activeElements = {};
      this.dispatch("emptySelectionGroup");
    },
    deleteActiveElements: function (state) {
      this.dispatch("emptySelectionGroup");
      for (const uuid in state.activeElements) {
        let element = state.scene.getObjectByProperty("uuid", uuid);

        if (element.userData.type !== 'Camera' && element.userData.type !== 'Origin') {
          this.commit("deleteElement", element);
        }
      }
      this.commit("clearActiveElements");
    },
    setActiveTool: function (state, tool) {
      if (state.selection.selectionGroup.length > 1) {
        if (tool == 'rotate' || tool == 'scale') {
          return state.activeTool = 'select';
        }
      }
      return state.activeTool = tool;
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
    setCtrlPressed: function (state, bool) {
      state.ctrlPressed = bool;
    },
    setSnapToGrid: function (state, bool) {
      state.snapToGrid = bool;
    },
    setLiveAnimation: function (state, options) {
      state[options.side + 'Animation'] = options.uuid;
    },
    setMixValue: function (state, value) {
      state.mixValue = value;
    },
    setGlobalOpacity: function (state, value) {
      state.globalOpacity = value;
    }
  }
})
