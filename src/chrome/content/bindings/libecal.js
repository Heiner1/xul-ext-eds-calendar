var libecal = {
    
    ecallibPath: ["libecal-1.2.so.15"],

    lib: null,
    
    init: function() {
        
        Components.utils.import("resource://gre/modules/ctypes.jsm");

        for (var path in this.ecallibPath) {
            try {
                this.lib = ctypes.open(this.ecallibPath[path]);
                this.debug("Opened " + this.ecallibPath[path]);
                break;
            } catch (err) {
                this.debug("Failed to open " + this.ecallibPath[path] + ": " + err);
            }
        }

        this.declareESource(this);
        this.declareECalClientSourceType(this);
        this.declareECalClient(this);

    },
    

    declareESource : function(parent) {

    	// Structures
    	parent._ESource = new ctypes.StructType("_ESource"); 
    	parent.ESource = parent._ESource;

    	// Methods
    	parent.e_source_new_with_uid = parent.lib.declare("e_source_new_with_uid",
    			ctypes.default_abi, parent.ESource.ptr, glib.gchar.ptr, glib.GMainContext.ptr,
    			glib.GError.ptr.ptr);

    	parent.e_source_get_extension = parent.lib.declare("e_source_get_extension",
    			ctypes.default_abi, glib.gpointer, parent.ESource.ptr, glib.gchar.ptr);

    	parent.e_source_set_display_name = parent.lib.declare(
    			"e_source_set_display_name", ctypes.default_abi, ctypes.void_t,
    			parent.ESource.ptr, glib.gchar.ptr);

    	parent.e_source_get_display_name = parent.lib.declare(
    			"e_source_get_display_name", ctypes.default_abi, glib.gchar.ptr,
    			parent.ESource.ptr);

    	parent.e_source_get_uid = parent.lib.declare("e_source_get_uid",
    			ctypes.default_abi, glib.gchar.ptr, parent.ESource.ptr);

    	parent.e_source_set_parent = parent.lib.declare("e_source_set_parent",
    			ctypes.default_abi, ctypes.void_t, parent.ESource.ptr, glib.gchar.ptr);

    	parent.e_source_get_uid = parent.lib.declare("e_source_get_parent",
    			ctypes.default_abi, glib.gchar.ptr, parent.ESource.ptr);
    	
    },
    
    declareECalClientSourceType : function(parent) {
    	// Enum
    	parent.ECalClientSourceType = {
    		E_CAL_CLIENT_SOURCE_TYPE_EVENTS : 0,
    		E_CAL_CLIENT_SOURCE_TYPE_TASKS : 1,
    		E_CAL_CLIENT_SOURCE_TYPE_MEMOS : 2,
    	};
    	parent.ECalClientSourceType.type = ctypes.int;
    },
    
    declareECalClient : function(parent) {

    	// Structures
    	parent._ECalClient = new ctypes.StructType("_ECalClient");
    	parent.ECalClient = parent._ECalClient;

    	// Methods
    	parent.e_cal_client_connect_sync = parent.lib.declare(
    			"e_cal_client_connect_sync", ctypes.default_abi,
    			parent.ECalClient.ptr, libecal.ESource.ptr,
    			libecal.ECalClientSourceType.type, gio.GCancellable.ptr,
    			glib.GError.ptr.ptr);

    	parent.e_cal_client_create_object_sync = parent.lib.declare(
    			"e_cal_client_create_object_sync", ctypes.default_abi,
    			glib.gboolean, parent.ECalClient.ptr, libical.icalcomponent.ptr,
    			glib.gchar.ptr.ptr, gio.GCancellable.ptr, glib.GError.ptr.ptr);

    	parent.e_cal_client_add_timezone_sync = parent.lib.declare(
    			"e_cal_client_add_timezone_sync", ctypes.default_abi,
    			glib.gboolean, parent.ECalClient.ptr, libical.icaltimezone.ptr,
    			gio.GCancellable.ptr, glib.GError.ptr.ptr);
    	
    	parent.e_cal_client_get_object_sync = parent.lib.declare(
    			"e_cal_client_get_object_sync", ctypes.default_abi,
    			glib.gboolean, parent.ECalClient.ptr, glib.gchar.ptr, glib.gchar.ptr,
    			libical.icalcomponent.ptr.ptr,
    			gio.GCancellable.ptr, glib.GError.ptr.ptr);
    	
    	
//    	parent.e_cal_client_get_objects_for_uid_sync = parent.lib.declare(
//    			"e_cal_client_get_objects_for_uid_sync", ctypes.default_abi,
//    			glib.gboolean, parent.ECalClient.ptr, glib.gchar.ptr, glib.GSList.ptr.ptr,
//    			gio.GCancellable.ptr, glib.GError.ptr.ptr);


    },
    
    debug: function (aMessage) {
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
            .getService(Components.interfaces.nsIConsoleService);
        consoleService.logStringMessage("Ecalclientlib (" + new Date() + " ):\n\t" + aMessage);
        window.dump("Ecalclientlib: (" + new Date() + " ):\n\t" + aMessage + "\n");
    },
    
    shutdown: function() {
        this.lib.close();
    }
};