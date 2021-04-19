/* ========================================== */
/* [Users] Required script data to fill in    */
/* ========================================== */
const USER_ID = "PasteYourUserIdHere";
const API_TOKEN = "PasteYourApiTokenHere"; // Do not share this to anyone
const WEB_APP_URL = "PasteGeneratedWebAppUrlHere";

/* ========================================== */
/* [Users] Required customizations to fill in */
/* ========================================== */

/* ========================================== */
/* [Users] Optional customizations to fill in */
/* ========================================== */
const ENABLE_NOTIFICATION = 1;

/* ========================================== */
/* [Users] Do not edit code below this line   */
/* ========================================== */
const AUTHOR_ID = "6ee1f819-036a-4977-94bd-22cae427bd43";
const SCRIPT_NAME = "Change Equipment";
const HEADERS = {
  "x-client" : AUTHOR_ID + "-" + SCRIPT_NAME,
  "x-api-user" : USER_ID,
  "x-api-key" : API_TOKEN,
}

const RETRY_AFTER_OFFSET_MS = 1000;

const FAIL_RETRY_AFTER_WAIT_MESSAGE_PART_1 = "**ERROR: Script Failed. Retry later.**  \n\n"
    + "**Script Name**: " + SCRIPT_NAME + "  \n"
    + "**Reason**: Number of server requests needed to complete script operation will exceed [rate limit](https://habitica.fandom.com/wiki/User_blog:LadyAlys/Rate_Limiting_(Intentional_Slow-Downs)_in_Some_Third-Party_Tools)  \n"
    + "**Recommendation**: Please wait for ";
const FAIL_RETRY_AFTER_WAIT_MESSAGE_PART_2 = " second(s), then try again"

const FAIL_RETRY_NOW_MESSAGE = "**ERROR: Script Failed. Retry now.**  \n\n"
    + "**Script Name**: " + SCRIPT_NAME + "  \n"
    + "**Reason**: Exceeded [rate limit](https://habitica.fandom.com/wiki/User_blog:LadyAlys/Rate_Limiting_(Intentional_Slow-Downs)_in_Some_Third-Party_Tools)  \n"
    + "**Recommendation**: Please avoid manually triggering scripts too quickly, or triggering a different script while another one is not yet finished running. By the time you receive this message, it should now be okay to manually trigger scripts again.";

const scriptProperties = PropertiesService.getScriptProperties(); // Constants can have properties changed

const SAVE_STRING = "Save equipment set";
const LOAD_STRING = "Load equipment set";

var scriptLocked = Number(scriptProperties.getProperty("scriptLocked"));
var copiedUserPropToScriptProp = Number(scriptProperties.getProperty("copiedUserPropToScriptProp"));

var user = 0;
var weaponKey, shieldKey, headKey, armorKey, headAccessoryKey, eyewearKey, bodyKey, backKey;

function doOneTimeSetup() {
  if (!scriptLocked) {
    // Get response from repeatable function to see remaining requests
    const response = api_createWebhook();
    const respHeaders = response.getAllHeaders();
    const remainingReq = Number(respHeaders["x-ratelimit-remaining"]);
    const resetDateTime = new Date(respHeaders["x-ratelimit-reset"]);
    const dateNow = new Date();
    const retryAfterMs = Math.max(0, resetDateTime - dateNow) + RETRY_AFTER_OFFSET_MS;
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    
    // If remaining requests <= 0, lock script, then after delay send retry now message and unlock script
    if (remainingReq <= 0) {
      // Lock script
      scriptLocked = 1;
      scriptProperties.setProperty("scriptLocked", scriptLocked);
      
      // Set trigger to unlock script and send retry now message after a delay
      ScriptApp.newTrigger("api_sendFailRetryNowMessageAndUnlockScript").timeBased().after(retryAfterMs).create();
    }
    // Else check requests needed
    else {
      const requestsNeeded = 1;

      // If remaining requests not enough, send message now to retry after waiting
      if (remainingReq < requestsNeeded) {
        api_sendPrivateMessage(FAIL_RETRY_AFTER_WAIT_MESSAGE_PART_1 + retryAfterSec + FAIL_RETRY_AFTER_WAIT_MESSAGE_PART_2, USER_ID);
      }
      // Else, continue with normal operation
      else {
        api_createRewardTasks();
      }
    }
  }
}

function doPost(e) {
  if (!scriptLocked) {
    const dataContents = JSON.parse(e.postData.contents);
    const webhookType = dataContents.type;
    const taskText = dataContents.task.text;
    const taskNotes = dataContents.task.notes;
    
    if (webhookType == "scored") {
      createKeyNames(taskNotes);

      if (taskText == SAVE_STRING) {
        doSaveButtonActions(taskNotes);
      }
      else if (taskText == LOAD_STRING) {
        doLoadButtonActions(taskNotes);
      }
    }
  }

  return HtmlService.createHtmlOutput();
}

function api_sendFailRetryNowMessageAndUnlockScript() {
  deleteTriggers("api_sendFailRetryNowMessageAndUnlockScript");

  var remainingReq = 0;
  var retryAfterMs = 0;
  
  while (remainingReq <= 0) {
    Utilities.sleep(retryAfterMs);
    
    var response = api_sendPrivateMessage(FAIL_RETRY_NOW_MESSAGE, USER_ID);
    var respHeaders = response.getAllHeaders();
    remainingReq = Number(respHeaders["x-ratelimit-remaining"]);
    var resetDateTime = new Date(respHeaders["x-ratelimit-reset"]);
    var dateNow = new Date();
    retryAfterMs = Math.max(0, resetDateTime - dateNow) + RETRY_AFTER_OFFSET_MS;
  }

  scriptLocked = 0;
  scriptProperties.setProperty("scriptLocked", scriptLocked);
}

function api_createWebhook() {
  const payload = {
    "url" : WEB_APP_URL,
    "label" : SCRIPT_NAME + " Webhook",
    "type" : "taskActivity",
    "options" : {
      "scored" : true,
    },
  }

  const params = {
    "method" : "post",
    "headers" : HEADERS,
    "contentType" : "application/json",
    "payload" : JSON.stringify(payload),
    "muteHttpExceptions" : true,
  }

  const url = "https://habitica.com/api/v3/user/webhook";
  return UrlFetchApp.fetch(url, params);
}

function api_createRewardTasks() {
  const payloadL1 = {"text" : LOAD_STRING, "type" : "reward", "notes" : "STR",}
  const payloadL2 = {"text" : LOAD_STRING, "type" : "reward", "notes" : "INT",}
  const payloadL3 = {"text" : LOAD_STRING, "type" : "reward", "notes" : "CON",}
  const payloadL4 = {"text" : LOAD_STRING, "type" : "reward", "notes" : "PER",}

  const payloadS1 = {"text" : SAVE_STRING, "type" : "reward", "notes" : "STR",}
  const payloadS2 = {"text" : SAVE_STRING, "type" : "reward", "notes" : "INT",}
  const payloadS3 = {"text" : SAVE_STRING, "type" : "reward", "notes" : "CON",}
  const payloadS4 = {"text" : SAVE_STRING, "type" : "reward", "notes" : "PER",}

  const params = {
    "method" : "post",
    "headers" : HEADERS,
    "contentType" : "application/json",
    "payload" : JSON.stringify([payloadS4, payloadS3, payloadS2, payloadS1, payloadL4, payloadL3, payloadL2, payloadL1]),
    "muteHttpExceptions" : true,
  }

  const url = "https://habitica.com/api/v3/tasks/user";
  return UrlFetchApp.fetch(url, params);
}

function deleteTriggers(functionName) {
  // Delete triggers to functionName to avoid reaching the maximum number of triggers
  const triggers = ScriptApp.getProjectTriggers();

  for (var i in triggers) {
    if (triggers[i].getHandlerFunction() == functionName) {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
}

function createKeyNames(prefix) {
  weaponKey = "myset_" + prefix + "_weapon";
  shieldKey = "myset_" + prefix + "_shield";
  headKey = "myset_" + prefix + "_head";
  armorKey = "myset_" + prefix + "_armor";
  headAccessoryKey = "myset_" + prefix + "_headAccessory";
  eyewearKey = "myset_" + prefix + "_eyewear";
  bodyKey = "myset_" + prefix + "_body";
  backKey = "myset_" + prefix + "_back";
}

function doSaveButtonActions(taskNotes) {
  // Get response from repeatable function to see remaining requests
  // - Get present equipment info
  const response = api_getUserInfo("items.gear.equipped");
  const respHeaders = response.getAllHeaders();
  const remainingReq = Number(respHeaders["x-ratelimit-remaining"]);
  const resetDateTime = new Date(respHeaders["x-ratelimit-reset"]);
  const dateNow = new Date();
  const retryAfterMs = Math.max(0, resetDateTime - dateNow) + RETRY_AFTER_OFFSET_MS;
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  
  // If remaining requests <= 0, lock script, then after delay send retry now message and unlock script
  if (remainingReq <= 0) {
    // Lock script
    scriptLocked = 1;
    scriptProperties.setProperty("scriptLocked", scriptLocked);
    
    // Set trigger to unlock script and send retry now message after a delay
    ScriptApp.newTrigger("api_sendFailRetryNowMessageAndUnlockScript").timeBased().after(retryAfterMs).create();
  }
  // Else check requests needed
  else {
    const requestsNeeded = (ENABLE_NOTIFICATION > 0); // if ENABLE_NOTIFICATION, 1, else 0

    // If remaining requests not enough, send message now to retry after waiting
    if (remainingReq < requestsNeeded) {
      api_sendPrivateMessage(FAIL_RETRY_AFTER_WAIT_MESSAGE_PART_1 + retryAfterSec + FAIL_RETRY_AFTER_WAIT_MESSAGE_PART_2, USER_ID);
    }
    // Else, continue with normal operation
    else {
      sanitizeItemValues();
      
      // Remember present equipment as myset_N
      scriptProperties.setProperty(weaponKey, user.items.gear.equipped.weapon);
      scriptProperties.setProperty(shieldKey, user.items.gear.equipped.shield);
      scriptProperties.setProperty(headKey, user.items.gear.equipped.head);
      scriptProperties.setProperty(armorKey, user.items.gear.equipped.armor);
      scriptProperties.setProperty(headAccessoryKey, user.items.gear.equipped.headAccessory);
      scriptProperties.setProperty(eyewearKey, user.items.gear.equipped.eyewear);
      scriptProperties.setProperty(bodyKey, user.items.gear.equipped.body);
      scriptProperties.setProperty(backKey, user.items.gear.equipped.back);
      
      // Send confirmation PM if enabled
      if (ENABLE_NOTIFICATION) {
        api_sendPrivateMessage(SAVE_STRING + " " + taskNotes + " completed." + getItemListString(), USER_ID);
      }
    }
  }
}

function doLoadButtonActions(taskNotes) {
  // Get response from repeatable function to see remaining requests
  // - Get present equipment info (to be able to unequip if needed)
  const response = api_getUserInfo("items.gear.equipped");
  const respHeaders = response.getAllHeaders();
  const remainingReq = Number(respHeaders["x-ratelimit-remaining"]);
  const resetDateTime = new Date(respHeaders["x-ratelimit-reset"]);
  const dateNow = new Date();
  const retryAfterMs = Math.max(0, resetDateTime - dateNow) + RETRY_AFTER_OFFSET_MS;
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);

  // If remaining requests <= 0, lock script, then after delay send retry now message and unlock script
  if (remainingReq <= 0) {
    // Lock script
    scriptLocked = 1;
    scriptProperties.setProperty("scriptLocked", scriptLocked);
    
    // Set trigger to unlock script and send retry now message after a delay
    ScriptApp.newTrigger("api_sendFailRetryNowMessageAndUnlockScript").timeBased().after(retryAfterMs).create();
  }
  // Else check requests needed
  else {
    const requestsNeededCodePath1 = 1;
    var requestsNeededCodePath2 = (ENABLE_NOTIFICATION > 0); // if ENABLE_NOTIFICATION, 1, else 0

    sanitizeItemValues();
    
    // Increment requestsNeededCodePath2 when old item is different from new item, i.e. api_changeItem() will use the API to change the item
    requestsNeededCodePath2 += (user.items.gear.equipped.weapon != scriptProperties.getProperty(weaponKey));
    requestsNeededCodePath2 += (user.items.gear.equipped.shield != scriptProperties.getProperty(shieldKey));
    requestsNeededCodePath2 += (user.items.gear.equipped.head != scriptProperties.getProperty(headKey));
    requestsNeededCodePath2 += (user.items.gear.equipped.armor != scriptProperties.getProperty(armorKey));
    requestsNeededCodePath2 += (user.items.gear.equipped.headAccessory != scriptProperties.getProperty(headAccessoryKey));
    requestsNeededCodePath2 += (user.items.gear.equipped.eyewear != scriptProperties.getProperty(eyewearKey));
    requestsNeededCodePath2 += (user.items.gear.equipped.body != scriptProperties.getProperty(bodyKey));
    requestsNeededCodePath2 += (user.items.gear.equipped.back != scriptProperties.getProperty(backKey));
    
    const requestsNeeded = Math.max(requestsNeededCodePath1, requestsNeededCodePath2);
    
    // If remaining requests not enough, send message now to retry after waiting
    if (remainingReq < requestsNeeded) {
      api_sendPrivateMessage(FAIL_RETRY_AFTER_WAIT_MESSAGE_PART_1 + retryAfterSec + FAIL_RETRY_AFTER_WAIT_MESSAGE_PART_2, USER_ID);
    }
    // Else, continue with normal operation
    else {
      if (!copiedUserPropToScriptProp) { 
        copyUserPropToScriptProp();
        copiedUserPropToScriptProp = 1;
        scriptProperties.setProperty("copiedUserPropToScriptProp", copiedUserPropToScriptProp);
      }
      
      if (scriptProperties.getProperty(weaponKey) == null) {
        api_sendPrivateMessage("Save an equipment set first before trying to load it! :P", USER_ID);
      }
      else {
        // Wear equipment set N
        api_changeItem("equip/equipped/", user.items.gear.equipped.weapon, scriptProperties.getProperty(weaponKey), "weapon_base_0");
        api_changeItem("equip/equipped/", user.items.gear.equipped.shield, scriptProperties.getProperty(shieldKey), "shield_base_0");
        api_changeItem("equip/equipped/", user.items.gear.equipped.head, scriptProperties.getProperty(headKey), "head_base_0");
        api_changeItem("equip/equipped/", user.items.gear.equipped.armor, scriptProperties.getProperty(armorKey), "armor_base_0");
        api_changeItem("equip/equipped/", user.items.gear.equipped.headAccessory, scriptProperties.getProperty(headAccessoryKey), "headAccessory_base_0");
        api_changeItem("equip/equipped/", user.items.gear.equipped.eyewear, scriptProperties.getProperty(eyewearKey), "eyewear_base_0");
        api_changeItem("equip/equipped/", user.items.gear.equipped.body, scriptProperties.getProperty(bodyKey), "body_base_0");
        api_changeItem("equip/equipped/", user.items.gear.equipped.back, scriptProperties.getProperty(backKey), "back_base_0");
        
        // Send confirmation PM if enabled
        if (ENABLE_NOTIFICATION) {
          api_sendPrivateMessage(LOAD_STRING + " " + taskNotes + " completed." + getItemListString(), USER_ID);
        }
      }
    }
  }
}

function api_getUserInfo(userFields) {
  const params = {
    "method" : "get",
    "headers" : HEADERS,
    "muteHttpExceptions" : true,
  }
  
  var url = "https://habitica.com/api/v3/user";
  if (userFields != "") {
    url += "?userFields=" + userFields;
  }

  const response = UrlFetchApp.fetch(url, params);
  user = JSON.parse(response).data;
  return response;
}

function sanitizeItemValues() {
  // Sanitize to simplify comparisons later
  if ((user.items.gear.equipped.weapon        == undefined) || (user.items.gear.equipped.weapon        == "") || (user.items.gear.equipped.weapon        == null)) user.items.gear.equipped.weapon        = "weapon_base_0";
  if ((user.items.gear.equipped.shield        == undefined) || (user.items.gear.equipped.shield        == "") || (user.items.gear.equipped.shield        == null)) user.items.gear.equipped.shield        = "shield_base_0";
  if ((user.items.gear.equipped.head          == undefined) || (user.items.gear.equipped.head          == "") || (user.items.gear.equipped.head          == null)) user.items.gear.equipped.head          = "head_base_0";
  if ((user.items.gear.equipped.armor         == undefined) || (user.items.gear.equipped.armor         == "") || (user.items.gear.equipped.armor         == null)) user.items.gear.equipped.armor         = "armor_base_0";
  if ((user.items.gear.equipped.headAccessory == undefined) || (user.items.gear.equipped.headAccessory == "") || (user.items.gear.equipped.headAccessory == null)) user.items.gear.equipped.headAccessory = "headAccessory_base_0";
  if ((user.items.gear.equipped.eyewear       == undefined) || (user.items.gear.equipped.eyewear       == "") || (user.items.gear.equipped.eyewear       == null)) user.items.gear.equipped.eyewear       = "eyewear_base_0";
  if ((user.items.gear.equipped.body          == undefined) || (user.items.gear.equipped.body          == "") || (user.items.gear.equipped.body          == null)) user.items.gear.equipped.body          = "body_base_0";
  if ((user.items.gear.equipped.back          == undefined) || (user.items.gear.equipped.back          == "") || (user.items.gear.equipped.back          == null)) user.items.gear.equipped.back          = "back_base_0";
}

function getItemListString() {
  return "  \n• weapon = " + scriptProperties.getProperty(weaponKey) +
         "  \n• shield = " + scriptProperties.getProperty(shieldKey) +
         "  \n• head = " + scriptProperties.getProperty(headKey) +
         "  \n• armor = " + scriptProperties.getProperty(armorKey) +
         "  \n• headAccessory = " + scriptProperties.getProperty(headAccessoryKey) +
         "  \n• eyewear = " + scriptProperties.getProperty(eyewearKey) +
         "  \n• body = " + scriptProperties.getProperty(bodyKey) +
         "  \n• back = " + scriptProperties.getProperty(backKey);
}

function api_sendPrivateMessage(message, toUserId) {
  const payload = {
    "message" : message,
    "toUserId" : toUserId,
  }
  
  const params = {
    "method" : "post",
    "headers" : HEADERS,
    "contentType" : "application/json",
    "payload" : JSON.stringify(payload),
    "muteHttpExceptions" : true,
  }

  const url = "https://habitica.com/api/v3/members/send-private-message";
  return UrlFetchApp.fetch(url, params);
}

// Copy user properties to script properties. For backwards compatibility.
function copyUserPropToScriptProp() {
  const userProperties = PropertiesService.getUserProperties(); // Constants can have properties changed
  const keyValueList = userProperties.getProperties();

  for (var key in keyValueList) {
    scriptProperties.setProperty(key, keyValueList[key]);
  }
}

function api_changeItem(itemType, oldItem, newItem, noEquipStr) {
  // Truth Table
  // oldItem  -> newItem   = Action
  // noEquipStr  noEquipStr  Do nothing
  // noEquipStr  item 1      Equip 1
  // noEquipStr  item 2      Equip 2
  // item 1      noEquipStr  Unequip 1
  // item 1      item 1      Do nothing
  // item 1      item 2      Equip 2
        
  if (oldItem != newItem) {
    const params = {
      "method" : "post",
      "headers" : HEADERS,
      "muteHttpExceptions" : true,
    }
    
    var url = "https://habitica.com/api/v3/user/" + itemType;

    // If newItem == noEquipStr, need to unequip
    if (newItem == noEquipStr) {
      url += oldItem;    // unequip
    }
    else {
      url += newItem; // equip
    }

    return UrlFetchApp.fetch(url, params);
  }
}
