var observable = require("data/observable");
var view = require("ui/core/view");
var dockLayoutDef = require("ui/layouts/dock-layout");
var gridLayoutModule = require("ui/layouts/grid-layout");
var absoluteLayoutDef = require("ui/layouts/absolute-layout");
var types = require("utils/types");
var fs = require("file-system");
var gestures = require("ui/gestures");
var KNOWNEVENTS = "knownEvents";
var UI_PATH = "ui/";
var MODULES = {
    "ActivityIndicator": "ui/activity-indicator",
    "ListView": "ui/list-view",
    "GridLayout": "ui/layouts/grid-layout",
    "DockLayout": "ui/layouts/dock-layout",
    "WrapLayout": "ui/layouts/wrap-layout",
    "AbsoluteLayout": "ui/layouts/absolute-layout",
    "StackLayout": "ui/layouts/stack-layout",
    "ScrollView": "ui/scroll-view",
    "SearchBar": "ui/search-bar",
    "SlideOut": "ui/slide-out",
    "TabView": "ui/tab-view",
    "TabEntry": "ui/tab-view",
    "TextField": "ui/text-field",
    "TextView": "ui/text-view",
    "FormattedString": "text/formatted-string",
    "Span": "text/span",
    "WebView": "ui/web-view",
    "SegmentedBar": "ui/segmented-bar",
    "SegmentedBarEntry": "ui/segmented-bar",
};
var ROW = "row";
var COL = "col";
var COL_SPAN = "colSpan";
var ROW_SPAN = "rowSpan";
var DOCK = "dock";
var LEFT = "left";
var TOP = "top";
function getComponentModule(elementName, namespace, attributes, exports) {
    var instance;
    var instanceModule;
    var componentModule;
    var moduleId = MODULES[elementName] || UI_PATH + elementName.toLowerCase();
    try {
        instanceModule = require(types.isString(namespace) && fs.path.join(fs.knownFolders.currentApp().path, namespace) || moduleId);
        var instanceType = instanceModule[elementName] || Object;
        instance = new instanceType();
    }
    catch (ex) {
        throw new Error("Cannot create module " + moduleId + ". " + ex);
    }
    if (instance && instanceModule) {
        var bindings = new Array();
        for (var attr in attributes) {
            var attrValue = attributes[attr];
            if (isBinding(attrValue) && instance.bind) {
                if (isKnownEvent(attr, instanceModule)) {
                    var propertyChangeHandler = function (args) {
                        if (args.propertyName === "bindingContext") {
                            var handler = instance.bindingContext && instance.bindingContext[getPropertyNameFromBinding(attrValue)];
                            if (types.isFunction(handler)) {
                                instance.on(attr, handler, instance.bindingContext);
                            }
                            instance.off(observable.knownEvents.propertyChange, propertyChangeHandler);
                        }
                    };
                    instance.on(observable.knownEvents.propertyChange, propertyChangeHandler);
                }
                else {
                    instance.bind(getBinding(instance, attr, attrValue));
                }
            }
            else if (isKnownEvent(attr, instanceModule)) {
                var handler = exports && exports[attrValue];
                if (types.isFunction(handler)) {
                    instance.on(attr, handler);
                }
            }
            else if (isGesture(attr, instance)) {
                var gestureHandler = exports && exports[attrValue];
                if (types.isFunction(gestureHandler)) {
                    instance.observe(gestures.fromString(attr.toLowerCase()), gestureHandler);
                }
            }
            else if (attr === ROW) {
                gridLayoutModule.GridLayout.setRow(instance, !isNaN(+attrValue) && +attrValue);
            }
            else if (attr === COL) {
                gridLayoutModule.GridLayout.setColumn(instance, !isNaN(+attrValue) && +attrValue);
            }
            else if (attr === COL_SPAN) {
                gridLayoutModule.GridLayout.setColumnSpan(instance, !isNaN(+attrValue) && +attrValue);
            }
            else if (attr === ROW_SPAN) {
                gridLayoutModule.GridLayout.setRowSpan(instance, !isNaN(+attrValue) && +attrValue);
            }
            if (attr === LEFT) {
                absoluteLayoutDef.AbsoluteLayout.setLeft(instance, !isNaN(+attrValue) && +attrValue);
            }
            else if (attr === TOP) {
                absoluteLayoutDef.AbsoluteLayout.setTop(instance, !isNaN(+attrValue) && +attrValue);
            }
            else if (attr === DOCK) {
                dockLayoutDef.DockLayout.setDock(instance, attrValue);
            }
            else {
                var attrHandled = false;
                if (instance.applyXmlAttribute) {
                    attrHandled = instance.applyXmlAttribute(attr, attrValue);
                }
                if (!attrHandled) {
                    var valueAsNumber = +attrValue;
                    if (!isNaN(valueAsNumber)) {
                        instance[attr] = valueAsNumber;
                    }
                    else if (attrValue && (attrValue.toLowerCase() === "true" || attrValue.toLowerCase() === "false")) {
                        instance[attr] = attrValue.toLowerCase() === "true" ? true : false;
                    }
                    else {
                        instance[attr] = attrValue;
                    }
                }
            }
        }
        componentModule = { component: instance, exports: instanceModule, bindings: bindings };
    }
    return componentModule;
}
exports.getComponentModule = getComponentModule;
function isGesture(name, instance) {
    return gestures.fromString(name.toLowerCase()) !== undefined;
}
function isKnownEvent(name, exports) {
    return (KNOWNEVENTS in exports && name in exports[KNOWNEVENTS]) || (KNOWNEVENTS in view && name in view[KNOWNEVENTS]);
}
function getBinding(instance, name, value) {
    return { targetProperty: name, sourceProperty: getPropertyNameFromBinding(value), twoWay: true };
}
function getPropertyNameFromBinding(value) {
    return value.replace("{{", "").replace("}}", "").trim();
}
function isBinding(value) {
    var isBinding;
    if (types.isString(value)) {
        var str = value.trim();
        isBinding = str.indexOf("{{") === 0 && str.lastIndexOf("}}") === str.length - 2;
    }
    return isBinding;
}
