import { defineComponent, h, onBeforeMount, onMounted, ref, watch } from 'vue';
import emitter from 'tiny-emitter/instance';
import { VirtualProps } from './props';
import Virtual from './virtual';
import { Item, Slot } from './item';

const EVENT_TYPE = {
  ITEM: 'item_resize',
  SLOT: 'slot_resize',
};
const SLOT_TYPE = {
  HEADER: 'thead', // string value also use for aria role attribute
  FOOTER: 'tfoot',
};

export default defineComponent({
  name: 'VirtualList',
  inheritAttrs: true,
  props: VirtualProps,
  setup(props, { emit, slots, expose }) {
    const range = ref<any>(null);
    const isHorizontal = ref(props.direction === 'horizontal');
    const directionKey = ref(isHorizontal.value ? 'scrollLeft' : 'scrollTop');
    const shepherd = ref();
    let virtual: any = null;
    const root = ref();

    /**
     * watch
     */
    watch(
      () => props.dataSources?.length,
      () => {
        virtual.updateParam('uniqueIds', getUniqueIdFromDataSources());
        virtual.handleDataSourcesChange();
      },
    );

    watch(
      () => props.start,
      (newValue) => {
        scrollToIndex(newValue);
      },
    );

    /**
     * methods
     */
    const getOffset = () => {
      if (props.pageMode) {
        return (
          document.documentElement[directionKey.value] ||
          document.body[directionKey.value]
        );
      } else {
        return root.value ? Math.ceil(root.value[directionKey.value]) : 0;
      }
    };
    // return client viewport size
    const getClientSize = () => {
      const key = isHorizontal.value ? 'clientWidth' : 'clientHeight';
      if (props.pageMode) {
        return document.documentElement[key] || document.body[key];
      } else {
        return root.value ? Math.ceil(root.value[key]) : 0;
      }
    };
    // return all scroll size
    const getScrollSize = () => {
      const key = isHorizontal.value ? 'scrollWidth' : 'scrollHeight';
      if (props.pageMode) {
        return document.documentElement[key] || document.body[key];
      } else {
        return root.value ? Math.ceil(root.value[key]) : 0;
      }
    };
    const emitEvent = (offset, clientSize, scrollSize, evt) => {
      emit('scroll', evt, virtual.getRange());

      if (
        virtual.isFront() &&
        !!props.dataSources.length &&
        offset - props.topThreshold <= 0
      ) {
        emit('totop');
      } else if (
        virtual.isBehind() &&
        offset + clientSize + props.bottomThreshold >= scrollSize
      ) {
        emit('tobottom');
      }
    };
    const onScroll = (evt) => {
      const offset = getOffset();
      const clientSize = getClientSize();
      const scrollSize = getScrollSize();

      // iOS scroll-spring-back behavior will make direction mistake
      if (offset < 0 || offset + clientSize > scrollSize + 1 || !scrollSize) {
        return;
      }

      virtual.handleScroll(offset);
      emitEvent(offset, clientSize, scrollSize, evt);
    };

    const getUniqueIdFromDataSources = () => {
      const { dataKey, dataSources = [] } = props;
      return dataSources.map((dataSource: any) =>
        typeof dataKey === 'function'
          ? dataKey(dataSource)
          : dataSource[dataKey],
      );
    };
    const onRangeChanged = (newRange: any) => {
      range.value = newRange;
    };
    const installVirtual = () => {
      virtual = new Virtual(
        {
          slotHeaderSize: 0,
          slotFooterSize: 0,
          keeps: props.keeps,
          estimateSize: props.estimateSize,
          buffer: Math.round(props.keeps / 3), // recommend for a third of keeps
          uniqueIds: getUniqueIdFromDataSources(),
        },
        onRangeChanged,
      );

      // sync initial range
      range.value = virtual.getRange();
    };
    // set current scroll position to a expectant index
    const scrollToIndex = (index: number) => {
      console.log(index);
      // scroll to bottom
      if (index >= props.dataSources.length - 1) {
        scrollToBottom();
      } else {
        const offset = virtual.getOffset(index);
        scrollToOffset(offset);
      }
    };
    // set current scroll position to a expectant offset
    const scrollToOffset = (offset: number) => {
      if (props.pageMode) {
        document.body[directionKey.value] = offset;
        document.documentElement[directionKey.value] = offset;
      } else {
        if (root.value) {
          root.value[directionKey.value] = offset;
        }
      }
    };
    // get the real render slots based on range data
    // in-place patch strategy will try to reuse components as possible
    // so those components that are reused will not trigger lifecycle mounted
    const getRenderSlots = () => {
      const slots = [];
      const { start, end } = range.value;
      const {
        dataSources,
        dataKey,
        itemClass,
        itemTag,
        itemStyle,
        extraProps,
        dataComponent,
        itemScopedSlots,
      } = props;
      for (let index = start; index <= end; index++) {
        const dataSource = dataSources[index];
        if (dataSource) {
          const uniqueKey =
            typeof dataKey === 'function'
              ? dataKey(dataSource)
              : dataSource[dataKey];
          if (typeof uniqueKey === 'string' || typeof uniqueKey === 'number') {
            slots.push(
              h(Item, {
                // props: {
                index,
                tag: itemTag,
                event: EVENT_TYPE.ITEM,
                horizontal: isHorizontal.value,
                uniqueKey: uniqueKey,
                source: dataSource,
                extraProps: extraProps,
                component: dataComponent,
                scopedSlots: itemScopedSlots,
                // },
                style: itemStyle,
                class: `${itemClass}${
                  props.itemClassAdd ? ' ' + props.itemClassAdd(index) : ''
                }`,
              }),
            );
          } else {
            console.warn(
              `Cannot get the data-key '${dataKey}' from data-sources.`,
            );
          }
        } else {
          console.warn(`Cannot get the index '${index}' from data-sources.`);
        }
      }
      return slots;
    };
    const onItemResized = (id, size) => {
      virtual.saveSize(id, size);
      emit('resized', id, size);
    };
    const onSlotResized = (type, size, hasInit) => {
      if (type === SLOT_TYPE.HEADER) {
        virtual.updateParam('slotHeaderSize', size);
      } else if (type === SLOT_TYPE.FOOTER) {
        virtual.updateParam('slotFooterSize', size);
      }

      if (hasInit) {
        virtual.handleSlotSizeChange();
      }
    };

    /**
     * lifecycles
     */
    onBeforeMount(() => {
      installVirtual();

      emitter.on(EVENT_TYPE.ITEM, onItemResized);

      if (slots.header || slots.footer) {
        emitter.on(EVENT_TYPE.SLOT, onSlotResized);
      }
    });

    onMounted(() => {
      // set position
      if (props.start) {
        scrollToIndex(props.start);
      } else if (props.offset) {
        scrollToOffset(props.offset);
      }

      // in page mode we bind scroll event to document
      if (props.pageMode) {
        // todo
      }
    });

    // set current scroll position to bottom
    const scrollToBottom = () => {
      if (shepherd.value) {
        const offset =
          shepherd.value[isHorizontal.value ? 'offsetLeft' : 'offsetTop'];
        scrollToOffset(offset);

        // check if it's really scrolled to the bottom
        // maybe list doesn't render and calculate to last range
        // so we need retry in next event loop until it really at bottom
        setTimeout(() => {
          if (getOffset() + getClientSize() < getScrollSize()) {
            scrollToBottom();
          }
        }, 3);
      }
    };

    // get the total number of stored (rendered) items
    const getSizes = () => {
      return virtual.sizes.size;
    };

    // get item size by id
    const getSize = (id) => {
      return virtual.sizes.get(id);
    };

    expose({
      scrollToBottom,
      getSizes,
      getSize,
      getScrollSize,
      getClientSize,
      scrollToOffset,
      scrollToIndex,
    });

    return () => {
      const {
        pageMode,
        rootTag,
        wrapTag,
        wrapClass,
        wrapStyle,
        headerTag,
        headerClass,
        headerStyle,
        footerTag,
        footerClass,
        footerStyle,
      } = props;
      const { padFront, padBehind } = range.value;
      const paddingStyle = {
        padding: isHorizontal.value
          ? `0px ${padBehind}px 0px ${padFront}px`
          : `${padFront}px 0px ${padBehind}px`,
      };
      const wrapperStyle = wrapStyle
        ? Object.assign({}, wrapStyle, paddingStyle)
        : paddingStyle;
      const { header, footer } = slots;

      return h(
        rootTag,
        {
          ref: root,
          onScroll: !pageMode && onScroll,
        },
        [
          // header slot
          header
            ? h(
                Slot,
                {
                  class: headerClass,
                  style: headerStyle,
                  // props: {
                  tag: headerTag,
                  event: EVENT_TYPE.SLOT,
                  uniqueKey: SLOT_TYPE.HEADER,
                  // },
                },
                header,
              )
            : null,

          // main list
          h(
            wrapTag,
            {
              class: wrapClass,
              style: wrapperStyle,
            },
            getRenderSlots(),
          ),

          // footer slot
          footer
            ? h(
                Slot,
                {
                  class: footerClass,
                  style: footerStyle,
                  // props: {
                  tag: footerTag,
                  event: EVENT_TYPE.SLOT,
                  uniqueKey: SLOT_TYPE.FOOTER,
                  // },
                },
                footer,
              )
            : null,

          // an empty element use to scroll to bottom
          h('div', {
            ref: shepherd,
            style: {
              width: isHorizontal.value ? '0px' : '100%',
              height: isHorizontal.value ? '100%' : '0px',
            },
          }),
        ],
      );
    };
  },
});
