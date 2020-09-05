import { act } from 'preact/test-utils';
import React from '../src';
import ReactDOM from '../src';

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
});
