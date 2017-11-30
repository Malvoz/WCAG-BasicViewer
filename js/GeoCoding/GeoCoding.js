define(["dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/registry",
    "dojo/on", 
    "dojo/Deferred", "dojo/query", 
    "dojo/text!application/GeoCoding/Templates/GeoCoding.html", 
    // "dojo/text!application/GeoCoding/Templates/GeoCodingHeader.html", 
    "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/event", 
    "dojo/parser", "dojo/ready",
    "dijit/layout/BorderContainer",
    "dojox/layout/ContentPane",  
    "esri/InfoTemplate", 
    "esri/symbols/PictureMarkerSymbol", "esri/symbols/TextSymbol", "esri/graphic", 
    "dojo/string", 
    "dojo/i18n!application/nls/GeoCoding",
    "esri/domUtils",
    "esri/dijit/Popup", 
    "application/PopupInfo/PopupInfoHeader",
    "application/SuperNavigator/SuperNavigator",
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, esriNS,
        _WidgetBase, _TemplatedMixin, registry,
        on, 
        Deferred, query,
        GeoCodingTemplate, 
        dom, domClass, domAttr, domStyle, domConstruct, event, 
        parser, ready,
        BorderContainer,
        ContentPane,
        InfoTemplate, 
        PictureMarkerSymbol, TextSymbol, Graphic,
        string,
        i18n,
        domUtils,
        Popup, PopupInfoHeader, SuperNavigator
    ) {

    ready(function(){
        // Call the parser manually so it runs after our widget is defined, and page has finished loading
        parser.parse();
    });

    var Widget = declare("esri.dijit.GeoCoding", [_WidgetBase, _TemplatedMixin, Evented], {
        // defaults
        templateString: GeoCodingTemplate,


        options: {
            map: null,
            toolbar: null, 
            header: 'pageHeader_geoCoding',
            superNavigator : null,
            maxSearchResults: 10,
            searchMarker: './images/SearchPin1.png',
            geolocatorLabelColor: "#0000ff", // 'green'
            emptyMessage: i18n.widgets.geoCoding.noAddress
        },

        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;
            this.widgetsInTemplate = true;

            this.map = defaults.map;
            this.search = defaults.search;
            this.maxSearchResults = defaults.maxSearchResults;
            this.searchMarker = defaults.searchMarker;
            this.geolocatorLabelColor = defaults.geolocatorLabelColor;
            this.toolbar = defaults.toolbar;
            this._i18n = i18n;
            this.headerNode = dom.byId(defaults.header);
            this.superNavigator = defaults.superNavigator;
            this.emptyMessage = defaults.emptyMessage;

            dojo.create("link", {
                href : "js/GeoCoding/Templates/geoCoding.css",
                type : "text/css",
                rel : "stylesheet",
            }, document.head);
        },

        startup: function () {
            if (!this.map) {
                this.destroy();
                console.error("Map required");
                // return;
            }
            if (!this.toolbar) {
                this.destroy();
                console.error("Toolbar required");
                return;
            }
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },

        postCreate : function() {
            if(this.search) {
                this.search.enableLabel = true;
                this.search.maxResults = this.search.maxSuggestions = this.maxSearchResults;
                this.search.autoSelect = false;

                this.search.on('clear-search', lang.hitch(this, this.clearSearchGraphics));

                this.search.on('search-results', lang.hitch(this, function(e) {
                    // console.log('search-results', e);
                    var features = [];
                    if(e.results) {
                        for(var i = 0; i< this.search.sources.length; i++) {
                            if(e.results.hasOwnProperty(i)) {
                                var dataFeatures = e.results[i].map(function(r){ return r.feature;});
                                var infoTemplate = null;
                                var layer = null;
                                if(this.search.sources[i].hasOwnProperty('featureLayer')) {
                                    infoTemplate = this.search.sources[i].featureLayer.infoTemplate;
                                    layer = this.search.sources[i].featureLayer;
                                }
                                else {
                                    infoTemplate = new InfoTemplate(
                                        "Locator", 
                                        "<div class='esriViewPopup'>"+
                                        "<div Tabindex=0 class='header'>${Addr_type} ${Loc_name} ${Subregion}</div>"+
                                        "<div class='hzLine'></div>"+
                                        "<span Tabindex=0>${LongLabel}</span>"+
                                        "<br/><span tabindex=0 class='locatorScore'>Score: ${Score}</span>"+
                                        "</div>"
                                        );   
                                }
                                for(var j = 0; j< dataFeatures.length; j++) {
                                    dataFeatures[j].infoTemplate = infoTemplate;
                                    dataFeatures[j]._layer = layer;
                                }
                                features = features.concat(dataFeatures);
                            }
                        }
                        // console.log('features-results', features);
                    }
                    this.search.map.infoWindow.show();
                    if(features && features !== undefined && features.length > 0) {
                        this.search.map.infoWindow.setFeatures(features);
                    }
                    else { 
                        this.search.map.infoWindow.clearFeatures();
                    }
                }));
            }
        },

        geoCodingHeader : null,
        contentPanel : null,

        _init: function () {

            this.loaded = true;

            var popup = this.map.infoWindow;

            // var textProbe = dojo.byId('searchTextProbe');
            // var cs = domStyle.getComputedStyle(textProbe);
            // var fontSize = cs.fontSize.slice(0,-2);
            // this.searchLabel = new TextSymbol({
            //     yoffset : -fontSize,//-14,
            //     haloColor: [255,255,255,255],
            //     haloSize: 2,
            //     font : 
            //     {
            //         family : cs.fontFamily, //"Roboto Condensed",
            //         size : fontSize, //18,
            //         weight : cs.fontWeight, //'bold'
            //     }
            // });
            // this.searchLabel.color = this.geolocatorLabelColor; //"red";

            // domConstruct.destroy(textProbe);

            this.searchMarker = new esri.symbol.PictureMarkerSymbol({
                "angle": 0,
                "xoffset": 0,
                "yoffset": 15,
                "type": "esriPMS",
                "url": require.toUrl(this.searchMarker),
                "contentType": "image/png",
                "width": 30,
                "height": 30
            });

            ////https://developers.arcgis.com/javascript/3/sandbox/sandbox.html?sample=popup_sidepanel

            this.contentPanel = new ContentPane({
                region: "center",
                id: "geoCodingContent",
                tabindex: 0,
            }, dom.byId("geoCoding_content"));
            this.contentPanel.startup();
            this.contentPanel.set("content", i18n.widgets.geoCoding.instructions);
            
            this.geoCodingHeader = new PopupInfoHeader({
                map: this.map,
                toolbar: this.toolbar, 
                header: 'pageHeader_geoCoding', 
                id: 'geoCoding_headerId', 
                superNavigator : this.superNavigator,
                emptyMessage : this.emptyMessage
            }, domConstruct.create('Div', {}, this.headerNode));
            this.geoCodingHeader.startup();

            popup.set("popupWindow", false);

            this.displayPopupContent = lang.hitch(this, function (feature) {
                if(!this.toolbar.IsToolSelected('geoCoding')) return;
                if (feature) {
                    this.contentPanel.set("content", feature.getContent()).then(lang.hitch(this, function() {
                        var mainSection = query('.esriViewPopup .mainSection', dojo.byId('geoCodingContent'));
                        if(mainSection && mainSection.length > 0) {
                            var header = query('.header', mainSection[0]);
                            if(header && header.length > 0) {
                                domAttr.set(header[0], 'tabindex', 0);
                            }

                            var attrTable = query('.attrTable', mainSection[0]);
                            if(attrTable && attrTable.length > 0) {
                                domAttr.set(attrTable[0], 'role', 'presentation');
                                var rows = query('tr', attrTable[0]);
                                if(rows) {
                                    rows.forEach(function(row) {domAttr.set(row, 'tabindex', 0);});
                                }
                            } 
                            else {
                                var description = query('[dojoattachpoint=_description]', mainSection[0]);
                                if(description && description.length > 0) {
                                    domAttr.set(description[0], 'tabindex', 0);
                                }
                            }

                            var editSummarySection = query('.esriViewPopup .editSummarySection', dojo.byId('geoCodingContent'));
                            if(editSummarySection) {
                                var editSummary =  query('.editSummary', editSummarySection[0]);
                                if(editSummary) {
                                    editSummary.forEach(function(edit) { domAttr.set(edit, 'tabindex', 0);});
                                }
                            }
                            var images = query('.esriViewPopup img', dojo.byId('geoCodingContent'));
                            if(images) {
                                images.forEach(function(img) {
                                    var alt = domAttr.get(img, 'alt');
                                    if(!alt) {
                                        domAttr.set(img,'alt','');
                                    } else {
                                        domAttr.set(img,'tabindex',0);
                                        if(!domAttr.get(img, 'title'))
                                        {
                                            domAttr.set(img,'title',alt);
                                        }
                                    }
                                });
                            }
                        }
                    }));
                }
            });

            // on(popup, "SetFeatures", lang.hitch(this, function() {
            //     console.log("SetFeatures", popup.features);
            // }));

            on(popup, "ClearFeatures", lang.hitch(this, function() {
                this.contentPanel.set("content", i18n.widgets.geoCoding.instructions);
                // if(this.superNavigator) {
                //     this.superNavigator.clearZone();
                // }
                if(this.geoCodingHeader) {
                    this.geoCodingHeader.setTotal(0);
                }
            }));

            on(popup, "SelectionChange", lang.hitch(this, function() {
                var selectedFeature = popup.getSelectedFeature();
                if(selectedFeature && selectedFeature !== undefined) {
                    this.displayPopupContent(selectedFeature);
                    this.clearSearchGraphics();
                    if(selectedFeature.infoTemplate) {
                        var geometry = selectedFeature.geometry;
                        if(geometry.type !== "point") {
                            var extent = geometry.getExtent().expand(1.5);
                            this.map.setExtent(extent);
                        } else {
                            this.map.centerAt(geometry);
                            if(!selectedFeature._layer) {
                                this.searchMarkerGrafic = new Graphic(geometry, this.searchMarker);
                                this.map.graphics.add(this.searchMarkerGrafic);

                                // this.searchLabel.setText(selectedFeature.attributes.ShortLabel);
                                // this.searchLabelGraphic = new Graphic(geometry, this.searchLabel);
                                // this.map.graphics.add(this.searchLabelGraphic);
                            }
                        }
                    }
                }
            }));

            // on(this.toolbar, 'updateTool', lang.hitch(this, function(name) {
            //     if(this.superNavigator && name !== 'infoPanel') {
            //         this.superNavigator.followTheMapMode(false);
            //     }
            // }));

            on(dojo.byId('pageBody_geoCoding'), 'keydown', lang.hitch(this, function(ev) {
                switch(ev.keyCode) {
                    case 37: // <
                        if(this.geoCodingHeader.total>1) {
                            this.geoCodingHeader.ToPrev();
                            ev.stopPropagation();
                            ev.preventDefault();
                        }
                        break;
                    case 39: // >
                        if(this.geoCodingHeader.total>1) {
                            this.geoCodingHeader.ToNext();
                            ev.stopPropagation();
                            ev.preventDefault();
                        }
                        break;
                    case 90: // Z
                        this.geoCodingHeader.ToZoom();
                        ev.stopPropagation();
                        ev.preventDefault();
                        break;
                    case 77: // M
                    case 80: // P
                        this.geoCodingHeader.ToMap();
                        ev.stopPropagation();
                        ev.preventDefault();

                        break;
                    case 88: // X
                    case 67: // C
                    case 69: // E
                        this.geoCodingHeader.ToClear();
                        ev.stopPropagation();
                        ev.preventDefault();
                        break;

                }}));
        },

        // clear: function() {
        //     this.map.infoWindow.clearFeatures();
        //     this.map.container.focus();
        // },

        clearSearchGraphics: function(){
            if(this.searchMarkerGrafic) {
                this.map.graphics.remove(this.searchMarkerGrafic);
                this.searchMarkerGrafic = null;
            }
            if(this.searchLabelGraphic) {
                this.map.graphics.remove(this.searchLabelGraphic);
                this.searchLabelGraphic = null;
            }
        },

        // showBadge : function(show) {
        //     var indicator = dom.byId('badge_followTheMapMode');
        //     if (show) {
        //         domStyle.set(indicator,'display','');
        //         domAttr.set(indicator, "title", i18n.widgets.popupInfo.followTheMap);
        //         domAttr.set(indicator, "alt", i18n.widgets.popupInfo.followTheMap);
        //     } else {
        //         domStyle.set(indicator,'display','none');
        //     }
        // },

    });
    if (has("extend-esri")) {
        lang.setObject("dijit.GeoCoding", Widget, esriNS);
    }
    return Widget;
});