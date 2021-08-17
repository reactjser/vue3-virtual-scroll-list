import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
  Ref,
} from 'vue';
// TODO: remove this
import emitter from 'tiny-emitter/instance';
import { ItemProps, SlotProps } from './props';

const useResizeChange = (props: any, rootRef: Ref<HTMLElement | null>) => {
  let resizeObserver: ResizeObserver | null = null;
  const shapeKey = computed(() =>
    props.horizontal ? 'offsetWidth' : 'offsetHeight',
  );

  const getCurrentSize = () => {
    return rootRef.value ? rootRef.value[shapeKey.value] : 0;
  };

  // tell parent current size identify by unqiue key
  const dispatchSizeChange = () => {
    const { event, uniqueKey, hasInitial } = props;
    emitter.emit(event, uniqueKey, getCurrentSize(), hasInitial);
  };

  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        dispatchSizeChange();
      });
      rootRef.value && resizeObserver.observe(rootRef.value);
    }
  });

  onUpdated(() => {
    dispatchSizeChange();
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });
};

export const Item = defineComponent({
  name: 'VirtualListItem',
  props: ItemProps,
  setup(props) {
    const rootRef = ref<HTMLElement | null>(null);
    useResizeChange(props, rootRef);

    return () => {
      const {
        tag: Tag,
        component: Comp,
        extraProps = {},
        index,
        source,
        scopedSlots = {},
        uniqueKey,
      } = props;
      const mergedProps = {
        ...extraProps,
        source,
        index,
      };

      return (
        <Tag key={uniqueKey} ref={rootRef}>
          <Comp {...mergedProps} scopedSlots={scopedSlots} />
        </Tag>
      );
    };
  },
});

export const Slot = defineComponent({
  name: 'VirtualListSlot',
  props: SlotProps,
  setup(props, { slots }) {
    const rootRef = ref<HTMLElement | null>(null);
    useResizeChange(props, rootRef);

    return () => {
      const { tag: Tag, uniqueKey } = props;

      return (
        <Tag ref={rootRef} key={uniqueKey}>
          {slots.default?.()}
        </Tag>
      );
    };
  },
});
