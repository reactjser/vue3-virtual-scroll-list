import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
  Ref,
} from 'vue';
import { ItemProps, SlotProps } from './props';

const useResizeChange = (
  props: any,
  rootRef: Ref<HTMLElement | null>,
  emit: any,
) => {
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
    emit(event, uniqueKey, getCurrentSize(), hasInitial);
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
  emits: ['itemResize'],
  setup(props, { emit }) {
    const rootRef = ref<HTMLElement | null>(null);
    useResizeChange(props, rootRef, emit);

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
  emits: ['slotResize'],
  setup(props, { slots, emit }) {
    const rootRef = ref<HTMLElement | null>(null);
    useResizeChange(props, rootRef, emit);

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
