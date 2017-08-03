define([
    "dojo/Evented", "dojo/_base/declare", "dojo/_base/lang", "dojo/has", 
    "dojo/dom", "esri/kernel", 
    "dijit/_WidgetBase", "dijit/_TemplatedMixin", 
    "dojo/on", "dojo/query", "dijit/registry",
    "dojo/text!application/ImageToggleButton/templates/ImageToggleButton.html", 
    "dojo/dom-class", "dojo/dom-attr", "dojo/dom-style", 
    "dojo/dom-construct", "dojo/_base/event", "esri/lang", 
    "dojo/NodeList-dom", "dojo/NodeList-traverse"
    
    ], function (
        Evented, declare, lang, has, dom, esriNS,
        _WidgetBase, _TemplatedMixin, 
        on, query, registry,
        dijitTemplate,
        domClass, domAttr, domStyle, 
        domConstruct, event, esriLang
    ) {
    var Widget = declare("esri.dijit.ImageToggleButton", [
        _WidgetBase, 
        _TemplatedMixin,
        Evented], {
        templateString: dijitTemplate,
        
        options: {
            // labelText:'My Label',
            // showLabel:false,
            class: null,
            value: null,
            type: 'checkbox',
            group: null,
            imgSelected: null,
            imgUnselected: null,
            imgClass: null,
            imgSelectedClass: null,
            imgUnselectedClass: null,
            titleSelected: 'Selected',
            titleUnselected: 'Unselected',
        },

        constructor: function (options, srcRefNode) {
            this.defaults = lang.mixin({}, this.options, options);
            this.id = this.defaults.id || dijit.registry.getUniqueId(this.declaredClass);
            this.domNode = srcRefNode;
            this.type = this.defaults.type;
            this.name = this.type==='radio' ? " name='"+this.defaults.group+"'":'';
            this._value = this.defaults.value !== '' ? " value="+this.defaults.value:'';
            this._class = this.defaults.class !== ''? " class='"+this.defaults.class+"'":'';


            var cssFile = "js/ImageToggleButton/Templates/ImageToggleButton.css";
            if(query('html link[href="'+cssFile+'"]').length===0) {
                var link = document.createElement("link");
                link.href = cssFile;
                link.type = "text/css";
                link.rel = "stylesheet";
                query('html')[0].appendChild(link);
            }
        },

        startup: function() {
            var cbInput = this.cbInput = dojo.byId(this.id+'_cb');
            if(!cbInput) return;
            var cbLabel = this.cbLabel = dojo.byId(this.id+'_lbl');
            on(cbLabel, 'keydown', lang.hitch(this, this._keyDown));

            on(cbInput, 'change', lang.hitch(this, function(ev) {
                this.emit('change', {
                    checked: cbInput.checked,
                    value: cbInput.value,
                });
            }));
        },

        focus: function() {
            this.cbLabel.focus();
        },

        preset: function(value) {
            if(!value != ! this.cbInput.checked) {
                this.cbInput.click();
            }
        },

        _keyDown: function(evt) {
            switch(evt.key) {
                case " " :
                case "Enter" :
                    evt.preventDefault();
                    this.cbInput.click();
                    break;
            }
        },

        isChecked : function() {
            return this.cbInput.checked;
        },

        Check: function(value) {
            if(this.cbInput.checked !== value) {
                this.cbInput.checked = value;
                this.emit('change', {checked: this.cbInput.checked});
            }
        }

    });

    if (has("extend-esri")) {
        lang.setObject("dijit.ImageToggleButton", Widget, esriNS);
    }
    return Widget;
});