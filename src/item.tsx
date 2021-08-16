import { defineComponent, h } from 'vue';
import emitter from 'tiny-emitter/instance';
import { ItemProps, SlotProps } from './props';

const Wrapper = {
  created() {
    this.shapeKey = this.horizontal ? 'offsetWidth' : 'offsetHeight';
  },

  mounted() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.dispatchSizeChange();
      });
      this.resizeObserver.observe(this.$el);
    }
  },

  // since componet will be reused, so disptach when updated
  updated() {
    this.dispatchSizeChange();
  },

  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  },

  methods: {
    getCurrentSize() {
      return this.$el ? this.$el[this.shapeKey] : 0;
    },

    // tell parent current size identify by unqiue key
    dispatchSizeChange() {
      emitter.emit(
        this.event,
        this.uniqueKey,
        this.getCurrentSize(),
        this.hasInitial,
      );
      // this.$parent.$emit(this.event, this.uniqueKey, this.getCurrentSize(), this.hasInitial)
    },
  },
};

export const Item = defineComponent({
  name: 'VirtualListItem',
  mixins: [Wrapper],
  props: ItemProps,
  render() {
    const {
      tag,
      component,
      extraProps = {},
      index,
      source,
      scopedSlots = {},
      uniqueKey,
    } = this;
    const props = {
      ...extraProps,
      source,
      index,
    };

    return h(
      tag,
      {
        key: uniqueKey,
      },
      [
        h(component, {
          ...props,
          scopedSlots: scopedSlots,
        }),
      ],
    );
  },
});

export const Slot = defineComponent({
  mixins: [Wrapper],
  props: SlotProps,
  setup(props, { slots }) {
    return () => {
      const { tag, uniqueKey } = props;

      return h(
        tag,
        {
          key: uniqueKey,
        },
        slots.default(),
      );
    };
  },
});
