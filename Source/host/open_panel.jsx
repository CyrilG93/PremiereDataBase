try {
    var xLib = new ExternalObject("lib:PlugPlugExternalObject");
    if (xLib) {
        var event = new CSXSEvent();
        event.type = "com.database.premiere.open";
        event.data = "";
        event.dispatch();
    }
} catch (e) {
    // Fail silently or log
}
