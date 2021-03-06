/* ***** BEGIN LICENSE BLOCK *****
 * EDS Calendar Integration
 * Copyright: 2011 Mark Tully <markjtully@gmail.com>
 * Copyright: 2014 Mateusz Balbus <balbusm@gmail.com>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * The GNU General Public License as published by the Free Software Foundation,
 * version 2 is available at: <http://www.gnu.org/licenses/>
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

Components.utils.import("resource://edscalendar/utils.jsm");

var edsCalendarClient = {
    
    calendar : null,
    
    init : function init() {
      addLogger(this, "edsCalendarClient");
      edsCalendarClient.LOG("Init start");
      this.edsCalendarService = Components.classes["@mozilla.org/calendar/calendar;1?type=eds"].getService(Components.interfaces.calICompositeCalendar);
      // TODO: Add cache?
      // get all the items from all calendars and add them to EDS
      function processCalendars(calendar) {
        calendar.getItems(Components.interfaces.calICalendar.ITEM_FILTER_ALL_ITEMS, 0, null, null, edsCalendarClient.calendarGetListener);
      } 
      edsCalendarClient.asyncLoop(cal.getCalendarManager().getCalendars({}),processCalendars);
      
      
      // setting up listeners etc
      if (this.calendar === null) {
        this.calendar = getCompositeCalendar();
      }
      if (this.calendar) {
        this.calendar.removeObserver(this.calendarObserver);
        this.calendar.addObserver(this.calendarObserver);
      }
      edsCalendarClient.LOG("Init finished");
      
    },
    
    operationTypeToString : function operationTypeToString(operationType) {
      let result;
      switch(operationType) {
      case Components.interfaces.calIOperationListener.ADD:
        result = "add";
        break;
      case Components.interfaces.calIOperationListener.MODIFY:
        result = "modify";
        break;
      case Components.interfaces.calIOperationListener.DELETE:
        result = "delete";
        break;
      case Components.interfaces.calIOperationListener.GET:
        result = "get";
        break;
      default:
        result = "unknown";
        break;
      }
      return result;
    },
    
    thread : Components.classes["@mozilla.org/thread-manager;1"]
      .getService(Components.interfaces.nsIThreadManager)
      .currentThread,
    
    asyncLoop : function asyncLoop(collection, callback) {
      var itemNumber = -1;
      function asyncLoopInternal() {
        itemNumber++;
        if (itemNumber  >= collection.length) {
          return;
        }
        var item = collection[itemNumber];
        callback.call(this, item);
        edsCalendarClient.thread.dispatch(asyncLoopInternal, edsCalendarClient.thread.DISPATCH_NORMAL);
        
      }
      
      asyncLoopInternal();
      
    },

    calendarGetListener : {
    
      onOperationComplete : function listener_onOperationComplete(aCalendar, aStatus, aOperationType, aId, aDetail) { 
        if (!Components.isSuccessCode(aStatus)) {
          edsCalendarClient.ERROR("Operation " + edsCalendarClient.operationTypeToString(aOperationType) +
              " on element " + aId + " failed. " + aStatus + " - " + aDetail);
          return;
        }
        // make sure that calendar has been created
        // when there are no items on a list
        let element;
        if (aOperationType == Components.interfaces.calIOperationListener.GET) {
          edsCalendarClient.edsCalendarService.addCalendar(aCalendar);
          element = aCalendar.id;
        } else {
          element = aId;
        }
        edsCalendarClient.LOG("Operation " + edsCalendarClient.operationTypeToString(aOperationType) + 
            " on element " + element + " completed");
        
 
      },
      onGetResult : function listener_onGetResult(aCalendar, aStatus, aItemType, aDetail, aCount, aItemscalendar) {
        if (!Components.isSuccessCode(aStatus)) {
          edsCalendarClient.ERROR("Unable to get results for calendar " + aCalendar.name + " - " + aCalendar.id +
              ". " + aStatus + " - " + aDetail);
          return;
        }
        edsCalendarClient.LOG("Adding events for calendar " + aCalendar.name + " - " + aCalendar.id);
        
        edsCalendarClient.edsCalendarService.startBatch();
        
        function processItem (item) {
          edsCalendarClient.LOG("Processing item " + item.title + " - " + item.id);
          edsCalendarClient.edsCalendarService.addItem(item, edsCalendarClient.calendarChangeListener);
          
        }
        edsCalendarClient.asyncLoop(aItemscalendar, processItem);
        edsCalendarClient.edsCalendarService.endBatch();
      }
    },
    
    calendarChangeListener : {
      onOperationComplete : function listener_onOperationComplete(aCalendar, aStatus, aOperationType, aId, aDetail) { 
        if (!Components.isSuccessCode(aStatus)) {
          edsCalendarClient.ERROR("Operation " + edsCalendarClient.operationTypeToString(aOperationType) +
              " on element " + aId + " failed. " + aStatus + " - " + aDetail);
          return;
        }
        
        let element;
        if (aOperationType == Components.interfaces.calIOperationListener.GET) {
          element = aCalendar.id;
        } else {
          element = aId;
        }
        edsCalendarClient.LOG("Operation " + edsCalendarClient.operationTypeToString(aOperationType) + 
            " on element " + element + " completed.");
        
      },
      onGetResult : function listener_onGetResult(aCalendar, aStatus, aItemType, aDetail, aCount, aItemscalendar) {
        throw "Unexpected operation";
      }
    },
    
    calendarObserver : {
      QueryInterface : XPCOMUtils.generateQI([
           Components.interfaces.calIObserver,
           Components.interfaces.calICompositeObserver
      ]),
      
      // calIObserver
      onAddItem : function onAddItem(aItem) {
        edsCalendarClient.edsCalendarService.addItem(aItem, this.calendarChangeListener);
        
      },

      // calIObserver
      onDeleteItem : function onDeleteItem(aItem) {
        edsCalendarClient.edsCalendarService.deleteItem(aItem, this.calendarChangeListener);
      },

      // calIObserver
      onModifyItem : function onModifyItem(aNewItem, aOldItem) {
        edsCalendarClient.edsCalendarService.modifyItem(aNewItem, aOldItem, this.calendarChangeListener);
      },

      // calICompositeObserver
      onCalendarAdded : function onCalendarAdded(aCalendar) {
        // This is called when a new calendar is added.
        // We can get all the items from the calendar and add them one by one to
        // Evolution Data Server
        aCalendar.getItems(Components.interfaces.calICalendar.ITEM_FILTER_ALL_ITEMS, 0, null, null, edsCalendarClient.calendarGetListener);
      },

      // calICompositeObserver
      onCalendarRemoved : function onCalendarRemoved(aCalendar) {
        edsCalendarClient.edsCalendarService.removeCalendar(aCalendar);
      },

      // calIObserver
      onStartBatch : function onStartBatch() {
      },

      // calIObserver
      onEndBatch : function onEndBatch() {
      },

      onError : function onError() { ; },
      onPropertyChanged : function onPropertyChanged(aCalendar, aName, aValue, aOldValue) { 
        edsCalendarClient.edsCalendarService.setProperty(aCalendar.id + "::" + aName, aValue);
      },
      onPropertyDeleting : function onPropertyDeleting(aCalendar, aName) { 
        edsCalendarClient.edsCalendarService.setProperty(aCalendar.id + "::" + aName, null);
      },
      onDefaultCalendarChanged : function onDefaultCalendarChanged() { ; },
      onLoad : function onLoad() { ; }
    }
};

window.addEventListener("load", function() {edsCalendarClient.init()}, false);


