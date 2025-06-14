import { bbh, bbw, borderBoxHeight, borderBoxWidth, cbh, cbw, clamp, contentBoxHeight, contentBoxWidth, doBorderObserve, doContentObserve, ROOT, setProperty, type InteractStatus } from "../../core/Utils";
import { fixedClientZoom, agWrapEvent, getBoundingOrientRect, grabForDrag } from "u2re/dom";

//
import { ref } from "u2re/object";
import {  E  } from "u2re/lure";

//
export class ResizeHandler {
    #holder: HTMLElement;
    #resizing = [{value: 0}, {value: 0}];

    // TODO: I'm too rigid for recover...
    get #parent() { return this.#holder?.parentNode; };

    //
    constructor(holder) {
        if (!holder) {
            throw Error("Element is null...");
        }

        //
        this.#holder = holder;
        this.#holder["@control"] = this;

        //
        const weak = new WeakRef(this), updSize_w = new WeakRef(this.#updateSize);
        doBorderObserve(this.#holder); if (this.#parent) { doContentObserve(this.#parent); }

        //
        ROOT.addEventListener("scaling", ()=>{
            const self = weak?.deref?.();
            try { updSize_w?.deref?.call?.(self); } catch(e) {};
        });

        //
        this.#resizing = [ref(0), ref(0)];
        E(this.#holder, { style: { "--resize-x": this.#resizing[0], "--resize-y": this.#resizing[1] } });
    }

    //
    #updateSize() {
        this.#holder[borderBoxWidth]  = this.#holder.offsetWidth  * fixedClientZoom(this.#holder);
        this.#holder[borderBoxHeight] = this.#holder.offsetHeight * fixedClientZoom(this.#holder);
        if (this.#parent) {
            const parent = this.#parent as HTMLElement;
            parent[contentBoxWidth]  = (parent.clientWidth ) * fixedClientZoom(parent);
            parent[contentBoxHeight] = (parent.clientHeight) * fixedClientZoom(parent);
        }
    }

    //
    limitResize(real, virtual, holder, container) {
        //const box = this.#holder.getBoundingClientRect();
        const box        = getBoundingOrientRect(holder) || holder?.getBoundingClientRect?.();
        const widthDiff  = cbw(container) - (bbw(holder) - (this.#resizing[0].value || 0) + ((box.left || 0) * fixedClientZoom(this.#holder)));
        const heightDiff = cbh(container) - (bbh(holder) - (this.#resizing[1].value || 0) + ((box.top  || 0) * fixedClientZoom(this.#holder)));

        // if relative of un-resized to edge corner max-size
        // discount of dragging offset!
        real[0] = clamp(0, virtual[0], widthDiff);
        real[1] = clamp(0, virtual[1], heightDiff);

        //
        return real;
    }

    //
    resizable(options) {
        const handler  = options.handler ?? this.#holder, status: InteractStatus = { pointerId: -1 };
        const weak     = new WeakRef(this.#holder), self_w = new WeakRef(this), upd_w = new WeakRef(this.#updateSize);
        const resizing = this.#resizing;

        //
        handler.addEventListener("pointerdown", agWrapEvent((evc) => {
            const self = self_w?.deref();
            const ev = evc?.detail || evc;

            //
            status.pointerId = ev.pointerId; try { upd_w?.deref?.call?.(self); } catch(e) {};
            const starting = [resizing[0].value || 0, resizing[1].value || 0];
            const holder = weak?.deref?.() as any;
            const parent = holder?.offsetParent ?? holder?.host ?? ROOT;

            //
            if (holder) {
                holder.style.setProperty("will-change", "contents, inline-size, block-size, width, height, transform", "important");
                grabForDrag(holder, ev, { result: resizing, shifting: self?.limitResize?.(starting, starting, holder, parent) });
            }

            //
            ev?.capture?.(self);
            // @ts-ignore
            //ev.target?.setPointerCapture?.(ev.pointerId);
        }));

        //
        this.#holder.addEventListener(
            "m-dragend",
            (evc) => {
                const self   = self_w?.deref?.();
                const holder = weak?.deref?.() as any;
                const dt = evc?.detail ?? evc; evc?.target?.style.removeProperty("will-change");
                if (dt.holding.propertyName == "resize") {
                    status.pointerId = -1;
                    //this.#resizeMute = false;
                }
            },
            {capture: true, passive: false}
        );
    }
}

//
export default ResizeHandler;
