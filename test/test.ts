// @ts-ignore
import { ref, makeReactive, assign } from "u2re/object"; import { Q } from "u2re/dom";
import { css, defineElement, GLitElement, property } from "../src/lure/extension/Glit";

//
import { E } from "../src/lure/node/Bindings";
import { H } from "../src/lure/node/Syntax";

//
@defineElement("x-block")
export class XBlock extends GLitElement() {
    constructor(...args) { super(...args); }

    //
    @property({source: "attr"}) tetris = 1;
    @property() opacity = 1;

    //
    protected styles = function() {
        return css`:host {opacity: ${this.opacity}; display: block; }`;
    }

    //
    protected render() {
        assign(this.opacity, this.tetris);
        E(this, { style: {display: "block"}, dataset: {tetris: this.tetris} }, []);
        return H`<slot>`;
    }

    //
    protected onInitialize(): any {
        super.onInitialize?.();
        return this;
    }
}

//
const children = ref("Движуха!");
const style = makeReactive({
    backgroundColor: "darkred",
    color: "white",
    inlineSize: "100px",
    blockSize: "100px",
    display: "flex",
    placeContent: "center",
    placeItems: "center",
    fontFamily: "\"Fira Code\"",
    fontSize: "0.8em"
});

// create document fragment
const dom = H`<${"x-block#test.test"} on:click=${()=>alert("Тетрис!")} style=${style}><span>${children}</span></div>`;
const scb = H`
<div data-mixin="ov-scrollbar" style="overflow: scroll; display: block; inline-size: 800px; block-size: 600px;">
<div style="inline-size: 100px; block-size: 1800px; background-color: black; color: white; display: flex; place-content: center; place-items: center;">Black Dolphin</div>
</div>`

//
setTimeout(()=>{
    children.value = "Разруха!";
    style.backgroundColor = "darkblue";
}, 1000);

//
document.body.append(dom);
document.body.append(scb);
