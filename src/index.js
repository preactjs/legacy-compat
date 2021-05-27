import {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue,
	version,
	Children,
	render,
	hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	unstable_batchedUpdates,
	StrictMode,
	Suspense,
	SuspenseList,
	lazy
} from 'preact/compat';

import PropTypes from 'prop-types';

import { options } from 'preact';

const DEV = process.env.NODE_ENV === 'development';

function replaceIterables(obj) {
	if (typeof obj !== 'object' || obj === null) {
	} else if (Array.isArray(obj)) {
		for (let i = obj.length; i--; ) {
			obj[i] = replaceIterables(obj[i]);
		}
	} else if (typeof obj.toJS === 'function') {
		if ('valueSeq' in obj) obj = obj.valueSeq();
		obj = obj.toJS();
	}
	return obj;
}

const HOOK_RENDER = '__r'; // _render
const VNODE_COMPONENT = '__c'; // _component
const NEXT_STATE = '__s'; // _nextState
const REF_SETTERS = '__rs';

const oldRenderHook = options[HOOK_RENDER];
let currentComponent = null;
options[HOOK_RENDER] = (vnode) => {
	currentComponent = vnode[VNODE_COMPONENT];
	if (!currentComponent[REF_SETTERS]) {
		currentComponent[REF_SETTERS] = {};
		currentComponent.refs = {};
	}
	if (oldRenderHook) oldRenderHook(vnode);
};

const oldVNodeHook = options.vnode;
options.vnode = (vnode) => {
	const type = vnode.type;
	const props = vnode.props;

	if (typeof vnode.ref === 'string') {
		const refSetters = currentComponent[REF_SETTERS];
		vnode.ref =
			refSetters[name] ||
			(refSetters[name] = setRef.bind(currentComponent.refs, vnode.ref));
	}

	if (props) {
		if (type == 'img' || type == 'canvas' || type == 'video') {
			if (props.width && isNaN(props.width)) {
				props.Width = props.width;
				props.width = undefined;
			}
			if (props.height && isNaN(props.height)) {
				props.Height = props.height;
				props.height = undefined;
			}
		}

		if (DEV) {
			if (typeof type === 'function' && type.propTypes) {
				PropTypes.checkPropTypes(
					type.propTypes,
					props,
					'prop',
					type.displayName || type.name
				);
			}
		}

		if (props.children != null) {
			props.children = replaceIterables(props.children);
		}
	}
	if (oldVNodeHook) oldVNodeHook(vnode);
};

function setRef(name, value) {
	this[name] = value;
}

function ContextProvider() {}
ContextProvider.prototype.getChildContext = function () {
	return this.props.c;
};
ContextProvider.prototype.render = function () {
	return this.props.v;
};

function unstable_renderSubtreeIntoContainer(
	parentComponent,
	vnode,
	container,
	callback
) {
	let wrap = createElement(ContextProvider, {
		c: parentComponent.context,
		v: vnode
	});
	let renderContainer = render(wrap, container);
	let component = renderContainer.__c || renderContainer.base;
	if (callback) callback.call(component, renderContainer);
	return component;
}

function assign(obj, props) {
	for (let i in props) obj[i] = props[i];
}

// patch the actual Component prototype (there is no dedicated Compat one anymore)
assign(Component.prototype, {
	refs: null,
	[REF_SETTERS]: null,
	isReactComponent: {},
	replaceState(state, callback) {
		this.setState({}, callback);
		assign((this[NEXT_STATE] = {}), state);
	},
	getDOMNode() {
		return this.base;
	},
	isMounted() {
		return !!this.base;
	}
});

/** @returns {typeof Component} */
function createClass(obj) {
	function cl(props, context) {
		Component.call(this, props, context);
		if (this.getInitialState) {
			this.state = this.getInitialState() || {};
		}
		for (let i in this) {
			if (
				typeof this[i] === 'function' &&
				!/^(constructor$|render$|shouldComponentUpda|component(Did|Will)(Mou|Unmou|Upda|Recei))/.test(
					i
				)
			) {
				this[i] = this[i].bind(this);
			}
		}
	}

	// We need to apply mixins here so that getDefaultProps is correctly mixed
	if (obj.mixins) {
		applyMixins(obj, collateMixins(obj.mixins));
	}
	if (obj.statics) assign(cl, obj.statics);
	cl.displayName = obj.displayName;
	cl.propTypes = obj.propTypes;
	cl.defaultProps = obj.getDefaultProps
		? obj.getDefaultProps.call(cl)
		: obj.defaultProps;
	assign((cl.prototype = new Component()), obj);
	cl.prototype.constructor = cl;

	return cl;
}

// Flatten an Array of mixins to a map of method name to mixin implementations
function collateMixins(mixins) {
	let keyed = {};
	for (let i = 0; i < mixins.length; i++) {
		let mixin = mixins[i];
		for (let key in mixin) {
			if (mixin.hasOwnProperty(key) && typeof mixin[key] === 'function') {
				(keyed[key] || (keyed[key] = [])).push(mixin[key]);
			}
		}
	}
	return keyed;
}

// apply a mapping of Arrays of mixin methods to a component prototype
function applyMixins(proto, mixins) {
	for (let key in mixins)
		if (mixins.hasOwnProperty(key)) {
			proto[key] = multihook(
				mixins[key].concat(proto[key] || []),
				key === 'getDefaultProps' ||
					key === 'getInitialState' ||
					key === 'getChildContext'
			);
		}
}

function callMethod(ctx, m, args) {
	if (typeof m === 'string') {
		m = ctx.constructor.prototype[m];
	}
	if (typeof m === 'function') {
		return m.apply(ctx, args);
	}
}

function multihook(hooks, skipDuplicates) {
	return function () {
		let ret;
		for (let i = 0; i < hooks.length; i++) {
			let r = callMethod(this, hooks[i], arguments);

			if (skipDuplicates && r != null) {
				if (!ret) ret = {};
				for (let key in r)
					if (r.hasOwnProperty(key)) {
						ret[key] = r[key];
					}
			} else if (typeof r !== 'undefined') ret = r;
		}
		return ret;
	};
}

export default {
	PropTypes,
	createClass,
	unstable_renderSubtreeIntoContainer,
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue,
	version,
	Children,
	render,
	hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	unstable_batchedUpdates,
	StrictMode,
	Suspense,
	SuspenseList,
	lazy
};

export {
	PropTypes,
	createClass,
	unstable_renderSubtreeIntoContainer,
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue,
	version,
	Children,
	render,
	hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	unstable_batchedUpdates,
	StrictMode,
	Suspense,
	SuspenseList,
	lazy
};
