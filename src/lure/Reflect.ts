// @ts-ignore /* @vite-ignore */
import { subscribe, observe } from "/externals/modules/object.js";
import { kebabToCamel, appendChild, handleDataset, handleAttribute, handleStyleChange, removeNotExists } from "./DOM.js";

//
export const reflectAttributes = (element: HTMLElement, attributes: any)=>{
    if (!attributes) return element;
    const weak = new WeakRef(attributes), wel = new WeakRef(element);
    if (typeof attributes == "object" || typeof attributes == "function") {
        subscribe(attributes, (value, prop)=>{
            handleAttribute(wel?.deref?.(), prop, value);

            // subscribe with value with `value` reactivity
            if (value?.value != null) {
                let controller: AbortController|null = null;
                subscribe([value, "value"], (curr, _, old) => {
                    controller?.abort?.(); controller = new AbortController();
                    // sorry, we doesn't allow abuse that mechanic
                    if (weak?.deref?.()?.[prop] === value || !(weak?.deref?.())) {
                        if (typeof value?.behaviour == "function") {
                            value?.behaviour?.([curr, (value = curr)=>handleAttribute(wel?.deref?.(), prop, value), old], [controller?.signal, prop, wel]);
                        } else {
                            handleAttribute(wel?.deref?.(), prop, curr);
                        }
                    }
                });
            }
        })
    } else
    { console.warn("Invalid attributes object:", attributes); }

    // bi-directional attribute
    const config = { attributeOldValue: true, attributes: true, childList: false, subtree: false };
    const callback = (mutationList, _) => {
        for (const mutation of mutationList) {
            if (mutation.type == "attributes") {
                const key = mutation.attributeName;
                const value = mutation.target.getAttribute(key);
                if (value !== mutation.oldValue) { // one-shot update (only valid when attribute is really changes)
                    if (attributes[key] != null && (attributes[key]?.value != null || (typeof attributes[key] == "object" || typeof attributes[key] == "function"))) {
                        if (attributes[key]?.value !== value) { attributes[key].value = value; }
                    } else
                    if (attributes[key] !== value) {
                        attributes[key] = value;
                    }
                }
            }
        }
    };

    //
    const observer = new MutationObserver(callback);
    observer.observe(element, config); return element;
}

//
export const reflectARIA = (element: HTMLElement, aria: any)=>{
    if (!aria) return element;
    const weak = new WeakRef(aria), wel = new WeakRef(element);
    if (typeof aria == "object" || typeof aria == "function") {
        subscribe(aria, (value, prop)=>{
            handleAttribute(wel?.deref?.(), "aria-"+prop, value);

            // subscribe with value with `value` reactivity
            if (value?.value != null) {
                subscribe([value, "value"], (curr) => {
                    // sorry, we doesn't allow abuse that mechanic
                    if (weak?.deref?.()?.[prop] === value || !(weak?.deref?.())) {
                        handleAttribute(wel?.deref?.(), "aria-"+prop, curr);
                    }
                });
            }
        })
    } else
    { console.warn("Invalid ARIA object:", aria);}; return element;
}

//
export const reflectDataset = (element: HTMLElement, dataset: any)=>{
    if (!dataset) return element;
    const weak = new WeakRef(dataset), wel = new WeakRef(element);
    if (typeof dataset == "object" || typeof dataset == "function") {
        subscribe(dataset, (value, prop)=>{
            handleDataset(wel?.deref?.(), prop, value);

            // subscribe with value with `value` reactivity
            if (value?.value != null) {
                subscribe([value, "value"], (curr) => {
                    // sorry, we doesn't allow abuse that mechanic
                    if (weak?.deref?.()?.[prop] === value || !(weak?.deref?.())) {
                        handleDataset(wel?.deref?.(), prop, curr);
                    }
                });
            }
        })
    } else
    { console.warn("Invalid dataset object:", dataset); }; return element;
}

// TODO! support observe styles
export const reflectStyles = (element: HTMLElement, styles: string|any)=>{
    if (!styles) return element;
    if (typeof styles == "string") { element.style.cssText = styles; } else
    if (typeof styles?.value == "string") { subscribe([styles, "value"], (val) => { element.style.cssText = val; }); } else
    if (typeof styles == "object" || typeof styles == "function") {
        const weak = new WeakRef(styles), wel = new WeakRef(element);
        subscribe(styles, (value, prop)=>{
            const cby = kebabToCamel(prop);
            if (wel?.deref?.()?.style?.[cby] !== value) {
                handleStyleChange(wel?.deref?.(), prop, value);
            }

            // subscribe with value with `value` reactivity (TypedOM isn't valid)
            if (value?.value != null && !(value instanceof CSSStyleValue)) {
                let controller: AbortController|null = null;
                subscribe([value, "value"], (curr, _, old) => {
                    controller?.abort?.(); controller = new AbortController();
                    // sorry, we doesn't allow abuse that mechanic
                    if (weak?.deref?.()?.style?.[cby] === value || !(weak?.deref?.())) {
                        if (typeof value?.behaviour == "function") {
                            value?.behaviour?.([curr, (value = curr)=>handleStyleChange(wel?.deref?.(), prop, value), old], [controller?.signal, prop, wel]);
                        } else {
                            handleStyleChange(wel?.deref?.(), prop, curr);
                        }
                    }
                });
            }
        });
    } else
    { console.warn("Invalid styles object:", styles); } return element;
}

// one-shot update
export const reflectWithStyleRules = async (element: HTMLElement, rule: any)=>{ const styles = await rule?.(element); return reflectStyles(element, styles); }
export const reflectProperties = (element: HTMLElement, properties: any)=>{
    if (!properties) return element; const weak = new WeakRef(properties), wel = new WeakRef(element);
    subscribe(properties, (value, prop)=>{
        if (value?.value != null) {
            subscribe([value, "value"], (curr) => {
                const el = wel?.deref?.();
                // sorry, we doesn't allow abuse that mechanic
                if ((weak?.deref?.()?.[prop] === value || !(weak?.deref?.())) && el) {
                    if (typeof curr == "undefined") { delete el[prop]; } else { el[prop] = curr; }
                }
            });
        } else {
            const el = wel?.deref?.();
            if (el && el?.[prop] !== value) {
                if (typeof value == "undefined") { delete el[prop]; } else { el[prop] = value; }
            }
        }
    })

    // if any input
    element.addEventListener("change", (ev: any)=>{
        if (ev?.target?.value != null && ev?.target?.value !== properties.value) properties.value = ev?.target?.value;
        if (ev?.target?.valueAsNumber != null && ev?.target?.valueAsNumber !== properties.valueAsNumber) properties.valueAsNumber = ev?.target?.valueAsNumber;
        if (ev?.target?.checked != null && ev?.target?.checked !== properties.checked) properties.checked = ev?.target?.checked;
    }); return element;
}

//
export const reflectChildren = (element: HTMLElement|DocumentFragment, children: any[] = [], mapper?: Function)=>{
    if (!children) return element; const ref = new WeakRef(element);
    mapper   = (children?.["@mapped"] ? (children as any)?.mapper : mapper) ?? mapper;
    children = (children?.["@mapped"] ? (children as any)?.children : children) ?? children;

    //
    const toBeRemoved: any[] = [], toBeAppend: any[] = [], toBeReplace: any[] = [];
    const merge = ()=>{ // @ts-ignore
        toBeAppend.forEach((args)=>appendChild(...args)); toBeAppend.splice(0, toBeAppend.length); // @ts-ignore
        toBeReplace.forEach((args)=>replaceChildren(...args)); toBeReplace.splice(0, toBeReplace.length); // @ts-ignore
        toBeRemoved.forEach((args)=>removeChild(...args)); toBeRemoved.splice(0, toBeRemoved.length); // @ts-ignore
    }

    //
    let controller: AbortController|null = null;
    if (Array.isArray(children) || (children as any)?.length != null) observe(children, (op, ...args)=>{
        controller?.abort?.(); controller = new AbortController();
        const element = ref.deref(); if (!element) return;
        if (element) {
            if (op == "@set")   { toBeReplace.push([element, args[1], args[0], mapper]); } // TODO: replace group
            if (op == "splice") { toBeRemoved.push([element, args[2] ?? children[args[0]?.[0]], mapper, args[0]?.[0]]); };
            if (op == "pop")    { toBeRemoved.push([element, args[2], mapper, children?.length-1]); };
            if (op == "push")   { if (args[0]?.[0] != null) toBeAppend.push([element, args[0]?.[0], mapper]); };
        }

        //
        if (children?.length == 0 && element instanceof HTMLElement) { /*element.innerHTML = ``;*/ removeNotExists(element, children, mapper); }; // @ts-ignore
        if (op && op != "@get" && ["@set", "splice", "pop", "push"].indexOf(op) >= 0) { // @ts-ignore
            if (typeof children?.behaviour == "function") { // @ts-ignore
                children?.behaviour?.([[toBeRemoved, toBeAppend, toBeReplace], merge], [controller.signal, op, ref, args]);
            } else
            { merge(); }
        }
    }); else
    subscribe(children, (obj, _, has)=>{
        controller?.abort?.(); controller = new AbortController();
        const element = ref.deref(); if (!element) return;
        if (element) {
            if (obj == null && has != null) { toBeRemoved.push([element, obj ?? has, mapper]); };
            if (obj != null && has == null) { toBeAppend.push([element, obj ?? has, mapper]); };
        }

        //
        if ((children as any)?.size == 0 && element instanceof HTMLElement) { removeNotExists(element, children, mapper);/*element.innerHTML = ``;*/ }; // @ts-ignore
        if (typeof children?.behaviour == "function") { // @ts-ignore
            children?.behaviour?.([[toBeRemoved, toBeAppend, toBeReplace], merge], [controller.signal, _, ref, [obj, has]]);
        } else
        { merge(); }
    }); return element;
}

//
export const reflectClassList = (element: HTMLElement, classList?: Set<string>)=>{
    if (!classList) return element; const wel = new WeakRef(element);
    subscribe(classList, (value: string)=>{
        const el = wel?.deref?.();
        if (el) {
            if (typeof value == "undefined" || value == null) {
                if (el.classList.contains(value)) { el.classList.remove(value); }
            } else {
                if (!el.classList.contains(value)) { el.classList.add(value); }
            }
        }
    }); return element;
}

// forcely update child nodes (and erase current content)
export const reformChildren = (element: HTMLElement|DocumentFragment, children: any[] = [], mapper?: Function)=>{
    if (!children) return element; const ref = new WeakRef(element); removeNotExists(element, children, mapper);
    mapper = (children?.["@mapped"] ? (children as any)?.mapper : mapper) ?? mapper;
    (children = (children?.["@mapped"] ? (children as any)?.children : children) ?? children).map((nd)=>{
        const element = ref.deref(); if (!element) return nd;
        appendChild(element, nd, mapper); return nd;
    }); return element;
}
