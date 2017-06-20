define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "dojo/dom","esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dojo/on", "dojo/mouse", "dijit/focus",
    "dojo/query", "esri/toolbars/navigation", "dijit/registry",
    "esri/dijit/HomeButton", "esri/dijit/LocateButton", 
    "esri/symbols/SimpleLineSymbol", "esri/Color", "esri/symbols/SimpleFillSymbol", 
    "esri/graphic", "esri/geometry/Point", "esri/geometry/Circle",
    "esri/layers/FeatureLayer", "esri/tasks/query", //"esri/tasks/QueryTask",
    //"dojo/text!application/SuperNavigator/templates/SuperNavigator.html", 
    // "dojo/i18n!application/nls",
    //SuperNavigator",
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", 
    "dojo/dom-construct", "dojo/_base/event", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, dom, esriNS,
        _WidgetBase, _TemplatedMixin, on, mouse, focusUtil,
        query, Navigation, registry,
        HomeButton, LocateButton, 
        SimpleLineSymbol, Color, SimpleFillSymbol,
        Graphic, Point, Circle,
        FeatureLayer, Query, //QueryTask,
        //SuperNavigatorTemplate, 
        // i18n,
        domClass, domAttr, domStyle, 
        domConstruct, event
    ) {
    var Widget = declare("esri.dijit.SuperNavigator", [
        _WidgetBase, 
        // _TemplatedMixin, 
        Evented], {
        // templateString: SuperNavigator,

        options: {
            map: null,
            navToolBar:null,
            cursorColor:"black",
            cursorFocusColor:"red",
            zoomColor:'red',
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            // this._i18n = i18n;
            // this.domNode = srcRefNode;

            this.set("map", defaults.map);
            this.set("navToolBar", defaults.navToolBar);
            this.set("zoomColor", defaults.zoomColor);
            this.set("cursorColor", defaults.cursorColor);            
            this.set("cursorFocusColor", defaults.cursorFocusColor);            
            },

        startup: function () {
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        cursorNav: null,
    
        _init: function () {
            //if(!dom.byId("navZoomIn")) return;

            // domStyle.set(dom.byId('mapDiv_zoom_slider'), 'background-color', 'transparent');
            // dojo.empty(this.navToolBar);

            var m = dom.byId('mapDiv').getBoundingClientRect();

            var cursorNav = this.cursorNav = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            domAttr.set(cursorNav, "id", "mapSuperCursor");
            domAttr.set(cursorNav,"tabindex","0");
            domAttr.set(cursorNav,"width","40");
            domAttr.set(cursorNav,"height","40");
            domStyle.set(cursorNav,"pointer-events","all");
            domStyle.set(cursorNav,"position","absolute");
            domStyle.set(cursorNav,"transform","translate("+((m.right-m.left)/2-20)+"px, "+((m.bottom-m.top)/2-20)+"px)");

            var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            domAttr.set(path,"d", "M20 0 L20 19 M20 21 L20 40 M0 20 L19 20 M21 20 L40 20");
            domAttr.set(path,"stroke", this.cursorColor);
            domAttr.set(path,"stroke-width", "2");

            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            domAttr.set(circle,"cx", "20");
            domAttr.set(circle,"cy", "20");
            domAttr.set(circle,"r", "7");
            domAttr.set(circle,"stroke", this.cursorFocusColor);
            domAttr.set(circle,"stroke-width", "1");
            domAttr.set(circle,"fill", "transparent");

            domConstruct.place(circle, cursorNav);
            domConstruct.place(path, cursorNav);
            
            domConstruct.place(cursorNav,'mapDiv_layers');

            // on(this.map, "mouse-down", lang.hitch(this, function(e) {
            //     domAttr.set(path,"stroke", this.cursorFocusColor);
            //     // path.focus();
            // }));
            // on(this.map, "mouse-up", lang.hitch(this, function(e) {
            //     domAttr.set(path,"stroke", this.cursorColor);
            //     //cursorNav.focus();
            // }));
        },

        cursorScroll:function(dx, dy) {
            if(!this.cursorNav) return;
            var cursorNav = this.cursorNav;
            var tr= domStyle.get(cursorNav, 'transform');
            var regex = /(matrix\(\d+,\s*\d+,\s*\d+,\s*\d+,\s)*(\d+(:?\.\d+)?),\s*(\d+(:?\.\d+)?)\)/ig;
            var result = regex.exec(tr);
            //tr=result[1]+(dx+Number(result[2]))+(dy+Number(result[4]))+')';

            // https://stackoverflow.com/questions/2038504/dojo-gfx-matrix-transformation
            // https://www.google.ca/search?q=dojo+translate&oq=dojo+translate&aqs=chrome..69i57j0l5.4311j0j7&sourceid=chrome&ie=UTF-8#q=dojo+transformation+matrix
            //cursorNav.translate((dx+Number(result[2])), dy+Number(result[4]));
        },

        getFeaturesAtPoint: function(mapPoint, extendRadius, allLayers, callback) {

            this.features = [];
            this.callback = callback;
            var tasks = [];
            var layers = allLayers.filter(function (l) { return l.hasOwnProperty("url");});

            var w = this.map.extent.getWidth()/75;
            if(extendRadius) w *= 10;

            var circleSymb = new SimpleFillSymbol(
                  SimpleFillSymbol.STYLE_SOLID,
                  new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 0, 0]),
                    1
                  ), new Color([255, 0, 0, 0.25])
            );

            for(var l = 0; l<layers.length; l++) {
                var circle = new Circle({
                    center: mapPoint,
                    geodesic: false,
                    radius: w,
                  });
                var q = new Query();
                q.outFields = ["*"];                    
                q.where = "1=1";
                q.geometry = circle;

                var graphic = new Graphic(circle, circleSymb);
                this.map.graphics.clear();
                this.map.graphics.add(graphic);

                q.spatialRelationship = "esriSpatialRelIntersects";
                q.returnGeometry = true;

                layer = layers[l];

                layer.layerObject.selectFeatures(
                    q, FeatureLayer.SELECTION_NEW, 
                    lang.hitch(this, function(results) {
                        if(this.callback)
                            this.callback(results);
                        }
                    )
                );
            }
            return this.features;
        },

    });

    if (has("extend-esri")) {
        lang.setObject("dijit.SuperNavigator", Widget, esriNS);
    }
    return Widget;
});