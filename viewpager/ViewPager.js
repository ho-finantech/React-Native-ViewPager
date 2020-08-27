/**
 * Created by tangzhibin on 16/2/28.
 */

"use strict";

import {
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import React, { Component } from "react";
import ViewPagerAndroid from "@react-native-community/viewpager";

const SCROLLVIEW_REF = "scrollView";
const VIEWPAGER_REF = "viewPager";

const SCROLL_STATE = {
  idle: "idle",
  settling: "settling",
  dragging: "dragging"
};
export default class ViewPager extends Component {
  static propTypes = { ...ViewPagerAndroid.propTypes };

  static defaultProps = {
    initialPage: 0,
    keyboardDismissMode: "on-drag",
    onPageScroll: null,
    onPageSelected: null,
    onPageScrollStateChanged: null,
    pageMargin: 0,
    horizontalScroll: true,
    setPageOnScrollViewLayoutChanges: true,
    checkOnScrollStop: false
  };

  _scrollState = SCROLL_STATE.idle;

  _preScrollX = null;

  _panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: this._onMoveShouldSetPanResponder,
    onPanResponderGrant: () => this._setScrollState(SCROLL_STATE.dragging),
    onPanResponderMove: () => null,
    onPanResponderRelease: () => this._setScrollState(SCROLL_STATE.settling),
    onPanResponderTerminate: () => null,
    onPanResponderTerminationRequest: (evt, gestureState) => true
  });

  constructor(props) {
    super(props);
    this._onPageScrollOnAndroid = this._onPageScrollOnAndroid.bind(this);
    this._onPageSelectedOnAndroid = this._onPageSelectedOnAndroid.bind(this);
    this._renderOnIOS = this._renderOnIOS.bind(this);
    this._onScrollOnIOS = this._onScrollOnIOS.bind(this);
    this._onScrollBeginDrag = this._onScrollBeginDrag.bind(this);
    this._onScrollEndDrag = this._onScrollEndDrag.bind(this);
    this._onScrollStop = this._onScrollStop.bind(this);
    this._onScrollViewLayout = this._onScrollViewLayout.bind(this);
    this._childrenWithOverridenStyle = this._childrenWithOverridenStyle.bind(
      this
    );
    this._setScrollState = this._setScrollState.bind(this);
    this.setPageWithoutAnimation = this.setPageWithoutAnimation.bind(this);
    this.setPage = this.setPage.bind(this);
    this.state = {
      page: props.initialPage
    };

    this.width = props.width ? props.width : 0;
    this.height = props.height ? props.height : 0;
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.height !== this.props.height ||
      nextProps.width !== this.props.width
    ) {
      this.width = nextProps.width;
      this.height = nextProps.height;
    }
  }

  render() {
    return this.props.forceScrollView || Platform.OS === "ios" ? (
      this._renderOnIOS()
    ) : (
      <ViewPagerAndroid
        {...this.props}
        scrollEnabled={this.props.horizontalScroll ? true : false}
        ref={VIEWPAGER_REF}
        key={this.props.children ? this.props.children.length : 0}
        onPageScroll={this._onPageScrollOnAndroid}
        onPageSelected={this._onPageSelectedOnAndroid}
      />
    );
  }

  _onMoveShouldSetPanResponder = (event, gestureState) => {
    if (this.props.horizontalScroll) {
      const dxAbs = Math.abs(gestureState.dx);
      return dxAbs > 10;
    }

    return true;
  };

  _onPageScrollOnAndroid(e) {
    if (this.props.onPageScroll) this.props.onPageScroll(e.nativeEvent);
  }

  _onPageSelectedOnAndroid(e) {
    if (this.props.onPageSelected) this.props.onPageSelected(e.nativeEvent);
  }

  _renderOnIOS() {
    let childrenCount = this.props.children ? this.props.children.length : 0;
    let initialPage = Math.min(
      Math.max(0, this.props.initialPage),
      childrenCount - 1
    );

    const { checkOnScrollStop } = this.props;

    const onScrollBeginDrag = checkOnScrollStop
      ? this._onScrollBeginDrag
      : null;
    const onScrollEndDrag = checkOnScrollStop ? this._onScrollEndDrag : null;

    let needMonitorScroll =
      !!this.props.onPageScroll ||
      !!this.props.onPageSelected ||
      !!this.props.onPageScrollStateChanged;

    let scrollEventThrottle = needMonitorScroll
      ? this.props.onPageScroll
        ? 8
        : 1
      : 0;

    if (checkOnScrollStop) {
      scrollEventThrottle = 16;
    }

    let needMonitorTouch = !!this.props.onPageScrollStateChanged;
    let props = {
      ...this.props,
      ref: SCROLLVIEW_REF,
      onLayout: this._onScrollViewLayout,
      horizontal: true,
      pagingEnabled: this.props.horizontalScroll ? true : false,
      scrollEnabled: this.props.horizontalScroll ? true : false,
      scrollsToTop: false,
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      children: this._childrenWithOverridenStyle(),
      contentOffset: { x: this.width * initialPage, y: 0 },
      decelerationRate: 0.9,
      onScroll: needMonitorScroll ? this._onScrollOnIOS : null,
      onScrollBeginDrag: onScrollBeginDrag,
      onScrollEndDrag: onScrollEndDrag,
      scrollEventThrottle: scrollEventThrottle
    };

    if (!this.props.width || !this.props.height) {
      props.onLayout = this._onScrollViewLayout;
    }

    if (needMonitorTouch)
      props = Object.assign(props, this._panResponder.panHandlers);
    const scrollViewStyle = {
      overflow: "visible",
      marginHorizontal: -this.props.pageMargin / 2
    };
    if (this.props.style && !this.props.style.height)
      return (
        <ScrollView {...props} style={[scrollViewStyle, this.props.style]} />
      );
    else
      return (
        <View style={this.props.style}>
          <ScrollView {...props} style={scrollViewStyle} />
        </View>
      );
  }

  _onScrollBeginDrag() {
    this.isUserDragging = true;
  }

  _onScrollEndDrag() {
    this.isUserDragging = false;
  }

  _onScrollStop() {
    if (this._preScrollX % this.width !== 0 && !this.isUserDragging) {
      if (this.props.onPageScroll) {
        const positionRaw = this._preScrollX / this.width;

        const position = Math.round(positionRaw);

        const xPosition = position * this.width;

        this.refs[SCROLLVIEW_REF].scrollTo({
          x: xPosition,
          y: 0,
          animated: true
        });

        if (this.props.onPageScroll) {
          this.props.onPageScroll({ offset: 0, position });
        }
      }
    }
  }

  _onScrollOnIOS(e) {
    let { x } = e.nativeEvent.contentOffset,
      offset,
      position = Math.floor(x / this.width);

    if (x === this._preScrollX) {
      return;
    }

    x = Math.min(x, this.width);

    this._preScrollX = x;
    offset = x / this.width - position;

    if (this.props.checkOnScrollStop) {
      if (this.onScrollTimeout) {
        clearTimeout(this.onScrollTimeout);
      }

      this.onScrollTimeout = setTimeout(() => {
        this._onScrollStop();
      }, 160);
    }

    if (this.props.onPageScroll) this.props.onPageScroll({ offset, position });

    if (this.props.onPageSelected && offset === 0) {
      this.props.onPageSelected({ position });
      this.props.onPageScrollStateChanged &&
        this._setScrollState(SCROLL_STATE.idle);
      this.setState({ page: position });
    }
  }

  _onScrollViewLayout(event) {
    let { width, height } = event.nativeEvent.layout;

    this.width = width;
    this.height = height;

    let forceUpdateCallback = null;

    if (this.props.setPageOnScrollViewLayoutChanges) {
      forceUpdateCallback = () =>
        Platform.OS === "ios" && this.setPageWithoutAnimation(this.state.page);
    }

    this.forceUpdate(forceUpdateCallback);
  }

  _childrenWithOverridenStyle() {
    if (this.width === 0 || this.height === 0) return null;
    return React.Children.map(this.props.children, child => {
      if (!child) return null;
      let newProps = {
        ...child.props,
        style: [
          child.props.style,
          {
            width: this.width,
            height: this.height,
            position: null
          }
        ],
        collapsable: false
      };
      if (
        child.type &&
        child.type.displayName &&
        child.type.displayName !== "RCTView" &&
        child.type.displayName !== "View"
      ) {
        console.warn(
          "Each ViewPager child must be a <View>. Was " + child.type.displayName
        );
      }
      return React.createElement(child.type, newProps);
    });
  }

  _setScrollState(scrollState) {
    if (scrollState === this._scrollState) return;
    this.props.onPageScrollStateChanged &&
      this.props.onPageScrollStateChanged(scrollState);
    this._scrollState = scrollState;
  }

  setPageWithoutAnimation(selectedPage) {
    this.setState({ page: selectedPage });
    if (this.props.forceScrollView || Platform.OS === "ios")
      this.refs[SCROLLVIEW_REF].scrollTo({
        x: this.width * selectedPage,
        animated: false
      });
    else {
      this.refs[VIEWPAGER_REF].setPageWithoutAnimation(selectedPage);
      if (this.props.onPageSelected)
        this.props.onPageSelected({ position: selectedPage });
    }
  }

  setPage(selectedPage) {
    this.setState({ page: selectedPage });
    if (this.props.forceScrollView || Platform.OS === "ios")
      this.refs[SCROLLVIEW_REF].scrollTo({
        x: this.width * selectedPage
      });
    else {
      this.refs[VIEWPAGER_REF].setPage(selectedPage);
      if (this.props.onPageSelected)
        this.props.onPageSelected({ position: selectedPage });
    }
  }

  scrollTo(x, y) {
    const scrollViewRef = this.refs[SCROLLVIEW_REF];

    if (scrollViewRef) {
      scrollViewRef.scrollTo({ x, y, animated: false });
    }
  }
}
