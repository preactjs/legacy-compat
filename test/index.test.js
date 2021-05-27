import { act } from 'preact/test-utils';
import React from '../src';
import ReactDOM from '../src';
import Immutable from 'immutable';

/* eslint-disable new-cap */

describe('Component', () => {
	let scratch;
	beforeEach(() => {
		scratch = document.createElement('div');
		document.body.appendChild(scratch);
	});
	afterEach(() => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	describe('string refs', () => {
		it('should have refs object', () => {
			let c;
			class Foo extends React.Component {
				constructor() {
					super();
					c = this;
				}
				render() {
					return null;
				}
			}
			ReactDOM.render(<Foo />, scratch);
			expect(c).toBeDefined();
			expect(c.refs).toBeInstanceOf(Object);
		});

		it('should populate string refs', () => {
			let c;
			class Foo extends React.Component {
				render() {
					c = this;
					// @ts-ignore-next
					return <span ref="foo">foo</span>;
				}
			}
			ReactDOM.render(<Foo />, scratch);
			expect(c).toBeDefined();
			expect(c.refs).toHaveProperty('foo', scratch.firstElementChild);
		});
	});

	describe('Attribute semantics for width & height props on media elements', () => {
		describe.each(['img', 'video', 'canvas'])('%s', (Tag) => {
			it('should remove px in width/height', () => {
				ReactDOM.render(<Tag height="100px" width="200px" />, scratch);
				expect(scratch.firstElementChild.getAttribute('height')).toEqual(
					'100px'
				);
				expect(scratch.firstElementChild.getAttribute('width')).toEqual(
					'200px'
				);
				// Note: can't use width/height properties, since they report incorrect values in JSDOM
				//expect(scratch.firstElementChild.height).toEqual(100);
				//expect(scratch.firstElementChild.width).toEqual(200);
			});

			it('should move % in width/height to style', () => {
				ReactDOM.render(<Tag height="50%" width="100%" />, scratch);
				expect(scratch.firstElementChild.getAttribute('height')).toEqual('50%');
				expect(scratch.firstElementChild.getAttribute('width')).toEqual('100%');
				// Note: can't use width/height properties, since they report incorrect values in JSDOM
			});
		});
	});

	describe('getInitialState', () => {
		it('should be called during creation', () => {
			let c;
			const Foo = React.createClass({
				getInitialState() {
					return { a: 1, b: this.props.b + 1 };
				},
				render() {
					c = this;
					return null;
				}
			});
			ReactDOM.render(<Foo b={2} />, scratch);
			expect(c).toBeDefined();
			expect(c.state).toMatchObject({ a: 1, b: 3 });
		});

		it('should allow setState()', async () => {
			let c;
			const Foo = React.createClass({
				getInitialState() {
					return { a: 1, b: 2 };
				},
				render() {
					c = this;
					return null;
				}
			});
			ReactDOM.render(<Foo />, scratch);
			await act(() => {
				c.setState({ a: 2 });
			});
			expect(c.state).toMatchObject({ a: 2, b: 2 });
			await act(() => {
				c.setState({ b: 3 });
			});
			expect(c.state).toMatchObject({ a: 2, b: 3 });
		});
	});

	describe('Immutable support', () => {
		it('should render Immutable.List values as text', () => {
			const ref = React.createRef();
			ReactDOM.render(
				<div ref={ref}>{Immutable.List(['a', 'b', 'c'])}</div>,
				scratch
			);
			expect(ref.current).toHaveProperty('textContent', 'abc');
		});

		it('should render Immutable.List values as elements/components', () => {
			const ref = React.createRef();
			ReactDOM.render(
				<ul ref={ref}>
					{Immutable.List(['a', 'b', 'c']).map((v) => (
						<li>{v}</li>
					))}
				</ul>,
				scratch
			);
			expect(ref.current).toHaveProperty(
				'outerHTML',
				'<ul><li>a</li><li>b</li><li>c</li></ul>'
			);
		});

		it('should render Immutable.Map values', () => {
			ReactDOM.render(
				<div>{Immutable.Map({ a: 'foo', b: 2, c: <span>three</span> })}</div>,
				scratch
			);
			expect(scratch.innerHTML).toEqual('<div>foo2<span>three</span></div>');
		});

		it('should render Immutable.List containing component children', () => {
			const A = jest.fn().mockReturnValue(<li>A</li>);
			const B = jest.fn().mockReturnValue(<li>B</li>);
			const C = jest.fn().mockReturnValue(<li>C</li>);
			const Root = (props) => props.children;
			ReactDOM.render(
				<ul>
					{Immutable.Set([
						<Root children={Immutable.List([<A />, <B />, <C />])} />,
						<li>D</li>
					])}
				</ul>,
				scratch
			);
			expect(scratch).toHaveProperty(
				'innerHTML',
				'<ul><li>A</li><li>B</li><li>C</li><li>D</li></ul>'
			);
		});
	});
});
