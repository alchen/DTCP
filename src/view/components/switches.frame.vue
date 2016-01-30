<style lang="sass">
@import '../assets/const';
$switch-transition-time: .2s;

.switches {
  @at-root .frame > .switches {
    background-color: rgba(255, 255, 255, 0.9);
  }

  .switchlist {
    margin: 0;
    padding: 0;
    list-style: none;

    .switch {
      padding: .75rem;
      cursor: pointer;
      position: relative;

      &.unread:before {
        content: '';
        border: .1875rem solid #5ae;
        position: absolute;
        border-radius: .25rem;
        top: calc(50% - .1875rem);
        left: .375rem;
      }

      &:hover {
        .text, .icon .iconic[data-glyph].iconic-md:before {
          color: $blue;
        }

        .icon img {
          box-shadow: 0 0 .5rem 0 $blue;
        }
      }

      .icon, .text {
        display: inline-block;
        vertical-align: middle;
      }

      .icon {
        padding: 0 .375rem;
        margin-right: .75rem;

        .iconic[data-glyph].iconic-md:before {
          font-size: 2rem;
          transition: color $switch-transition-time;
        }

        img {
          width: 2rem;
          height: 2rem;
          border: 1px solid #eee;
          border-radius: .25rem;
          box-shadow: 0 0 .5rem 0 rgba(0, 0, 0, 0.2);
          transition: box-shadow $switch-transition-time;
        }
      }

      .text {
        text-transform: uppercase;
        font-size: 1.25rem;
        transition: color $switch-transition-time;
      }
    }
  }
}
</style>

<template lang="html">
  <div class="switches" @click="leftclick">
    <div class="promptbackground"></div>
    <ul class="switchlist">
      <li class="switch" v-for="account in accounts" @click="switchUser(account.screenname)" :class="{ unread: account.unread }">
        <section class="icon"><img :src="account.biggerIcon" /></section>
        <section class="text" v-text="account.screenname"></section>
      </li>
      <li class="switch" @click.stop="addAccount">
        <section class="icon"><span class="iconic iconic-md" data-glyph="plus"></span></section>
        <section class="text">Add</section>
      </li>
    </ul>
  </div>
</template>

<script>
'use strict';

var Vue = require('vue');

var Switches = Vue.extend({
  replace: true,
  props: ['accounts', 'username', 'now', 'view'],
  methods: {
    switchUser: function (screenname) {
      this.$dispatch('switchUser', screenname);
    },
    addAccount: function (event) {
      this.$dispatch('addAccount');
    },
    leftclick: function () {
      // dismiss Switches
      this.$dispatch('back');
    }
  }
});

Vue.component('switches', Switches);

module.exports = Switches;
</script>
