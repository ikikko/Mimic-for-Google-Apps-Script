/*
 * Mimic-GAS is a XML-RPC client for Google Apps Script ( based on mimic.js )
 *
 * Change Log
 * - Support (basic) authentication
 * - Add handling response value as string when value type is not defined
 * - Replace with class supported Google Apps Script
 * ++ XmlHttpRequest -> UrlFetch
 * ++ DOM -> Xml
 * ++ Base64 -> Utilities.base64Encode/base64Decode
 *
 * @author ikikko (ikikko+github@gmail.com)
 */

/*
 * Mimic (XML-RPC Client for JavaScript) v2.0.1 Copyright (C) 2005-2009 Carlos
 * Eduardo Goncalves (cadu.goncalves@gmail.com)
 *
 * Mimic is dual licensed under the MIT
 * (http://opensource.org/licenses/mit-license.php) and GPLv3
 * (http://opensource.org/licenses/gpl-3.0.html) licenses.
 */

/**
 * XmlRpc
 */
function XmlRpc() {
};

/**
 * <p>
 * XML-RPC document prolog.
 * </p>
 */
XmlRpc.PROLOG = "<?xml version=\"1.0\"?>\n";

/**
 * <p>
 * XML-RPC methodCall node template.
 * </p>
 */
XmlRpc.REQUEST = "<methodCall>\n<methodName>${METHOD}</methodName>\n<params>\n${DATA}</params>\n</methodCall>";

/**
 * <p>
 * XML-RPC param node template.
 * </p>
 */
XmlRpc.PARAM = "<param>\n<value>\n${DATA}</value>\n</param>\n";

/**
 * <p>
 * XML-RPC array node template.
 * </p>
 */
XmlRpc.ARRAY = "<array>\n<data>\n${DATA}</data>\n</array>\n";

/**
 * <p>
 * XML-RPC struct node template.
 * </p>
 */
XmlRpc.STRUCT = "<struct>\n${DATA}</struct>\n";

/**
 * <p>
 * XML-RPC member node template.
 * </p>
 */
XmlRpc.MEMBER = "<member>\n${DATA}</member>\n";

/**
 * <p>
 * XML-RPC name node template.
 * </p>
 */
XmlRpc.NAME = "<name>${DATA}</name>\n";

/**
 * <p>
 * XML-RPC value node template.
 * </p>
 */
XmlRpc.VALUE = "<value>\n${DATA}</value>\n";

/**
 * <p>
 * XML-RPC scalar node template (int, i4, double, string, boolean, base64,
 * dateTime.iso8601).
 * </p>
 */
XmlRpc.SCALAR = "<${TYPE}>${DATA}</${TYPE}>\n";

/**
 * <p>
 * Get the tag name used to represent a JavaScript object in the XMLRPC
 * protocol.
 * </p>
 * 
 * @param data
 *            A JavaScript object.
 * @return <code>String</code> with XMLRPC object type.
 */
XmlRpc.getDataTag = function(data) {
	try {
		var tag = typeof data;
		switch (tag.toLowerCase()) {
		case "number":
			tag = (Math.round(data) == data) ? "int" : "double";
			break;
		case "object":
			if (data.constructor == Base64)
				tag = "base64";
			else if (data.constructor == String)
				tag = "string";
			else if (data.constructor == Boolean)
				tag = "boolean";
			else if (data.constructor == Array)
				tag = "array";
			else if (data.constructor == Date)
				tag = "dateTime.iso8601";
			else if (data.constructor == Number)
				tag = (Math.round(data) == data) ? "int" : "double";
			else
				tag = "struct";
			break;
		}
		return tag;
	} catch (e) {
		Engine.reportException(null, e);
	}
};

/**
 * <p>
 * Get JavaScript object type represented by XMLRPC protocol node.
 * <p>
 * 
 * @param node
 *            A XMLRPC node.
 * @return A JavaScript object.
 */
XmlRpc.getNodeData = function(node) {
	var tag = node.getName().getLocalName().toLowerCase();

	switch (tag) {
	case "dateTime.iso8601":
		return Date.fromIso8601(node.getText());
	case "boolean":
		return (node.getText() == "1") ? true : false;
	case "int":
	case "i4":
	case "double":
		return new Number(node.getText());
	case "string":
		return new String(node.getText());
	case "base64":
		return new Base64(node.getText());
	case "value":
		if (node.getText() != "") {
			return new String(node.getText());
		}
	}
};

/**
 * XmlRpcRequest
 * 
 * @param url
 *            Server url.
 * @param method
 *            Server side method do call.
 */
function XmlRpcRequest(url, method) {
	this.serviceUrl = url;
	this.methodName = method;
	this.params = [];
	this.authentication = null;
};

/**
 * <p>
 * Add a new request parameter.
 * </p>
 * 
 * @param data
 *            New parameter value.
 */
XmlRpcRequest.prototype.addParam = function(data) {
	var type = typeof data;
	switch (type.toLowerCase()) {
	case "function":
		return;
	case "object":
		if (!data.constructor.name)
			return;
	}
	this.params.push(data);
};

/**
 * <p>
 * Clear all request parameters.
 * </p>
 */
XmlRpcRequest.prototype.clearParams = function() {
	this.params.splice(0, this.params.length);
};

/**
 * <p>
 * Set authentication user and password.
 * </p>
 * 
 * @param user
 *            User for Authentication.
 * @param password
 *            Password for Authentication.
 * 
 */
XmlRpcRequest.prototype.setAuthentication = function(user, password) {
	this.authentication = {
		"user" : user,
		"password" : password
	};
};

/**
 * <p>
 * Execute a synchronous XML-RPC request.
 * </p>
 * 
 * @return XmlRpcResponse object.
 */
XmlRpcRequest.prototype.send = function() {
	var xml_params = "";
	for ( var i = 0; i < this.params.length; i++)
		xml_params += XmlRpc.PARAM.replace("${DATA}", this
				.marshal(this.params[i]));
	var xml_call = XmlRpc.REQUEST.replace("${METHOD}", this.methodName);
	xml_call = XmlRpc.PROLOG + xml_call.replace("${DATA}", xml_params);
	var optAdvancedArgs = {
		contentType : "text/xml",
		method : "post",
		payload : xml_call
	};
	if (this.authentication != null) {
		var authHeader = {
			Authorization : "Basic "
					+ new Base64(this.authentication["user"] + ":"
							+ this.authentication["password"]).encode()
		};
		optAdvancedArgs["headers"] = authHeader;
	}
	var response = UrlFetchApp.fetch(this.serviceUrl, optAdvancedArgs);
	return new XmlRpcResponse(Xml.parse(response.getContentText()));
};

/**
 * <p>
 * Marshal request parameters.
 * </p>
 * 
 * @param data
 *            A request parameter.
 * @return String with XML-RPC element notation.
 */
XmlRpcRequest.prototype.marshal = function(data) {
	var type = XmlRpc.getDataTag(data);
	var scalar_type = XmlRpc.SCALAR.replace(/\$\{TYPE\}/g, type);
	var xml = "";
	switch (type) {
	case "struct":
		var member = "";
		for ( var i in data) {
			var value = "";
			value += XmlRpc.NAME.replace("${DATA}", i);
			value += XmlRpc.VALUE.replace("${DATA}", this.marshal(data[i]));
			member += XmlRpc.MEMBER.replace("${DATA}", value);
		}
		xml = XmlRpc.STRUCT.replace("${DATA}", member);
		break;
	case "array":
		var value = "";
		for ( var i = 0; i < data.length; i++) {
			value += XmlRpc.VALUE.replace("${DATA}", this.marshal(data[i]));
		}
		xml = XmlRpc.ARRAY.replace("${DATA}", value);
		break;
	case "dateTime.iso8601":
		xml = scalar_type.replace("${DATA}", data.toIso8601());
		break;
	case "boolean":
		xml = scalar_type.replace("${DATA}", (data == true) ? 1 : 0);
		break;
	case "base64":
		xml = scalar_type.replace("${DATA}", data.encode());
		break;
	case "string":
		var convertData = "";
		for ( var i = 0; i < data.length; i++) {
			convertData += ("&#" + (data.charCodeAt(i)) + ";");
		}
		xml = scalar_type.replace("${DATA}", convertData);
		break;
	default:
		xml = scalar_type.replace("${DATA}", data);
		break;
	}
	return xml;
};

/**
 * XmlRpcResponse
 * 
 * @param xml
 *            Response XML document.
 */
function XmlRpcResponse(xml) {
	this.xmlData = xml;
};

/**
 * <p>
 * Indicate if response is a fault.
 * </p>
 * 
 * @return Boolean flag indicating fault status.
 */
XmlRpcResponse.prototype.isFault = function() {
	return this.faultValue;
};

/**
 * <p>
 * Parse XML response to JavaScript.
 * </p>
 * 
 * @return JavaScript object parsed from XML-RPC document.
 */
XmlRpcResponse.prototype.parseXML = function() {
	this.faultValue = undefined;
	this.propertyName = "";
	this.params = [];
	var top = this.xmlData.getDocument().getElement();
	for ( var i = 0; i < top.getElements().length; i++)
		this.params = this.unmarshal(top.getElements()[i], this.params);

	return this.params[0];
};

/**
 * <p>
 * Unmarshal response parameters.
 * </p>
 * 
 * @param node
 *            Current document node under processing.
 * @param parent
 *            Current node' parent node.
 */
XmlRpcResponse.prototype.unmarshal = function(node, parent) {
	var tag = node.getName().getLocalName().toLowerCase();

	if (tag == "fault") {
		this.faultValue = true;
	}

	if (tag == "struct" || tag == "array") {
		var children = (tag == "struct" ? new Object() : new Array());
		for ( var i = 0; i < node.getElements().length; i++) {
			children = this.unmarshal(node.getElements()[i], children);
		}
		this.addValueToParent(children, parent);

	} else if (/[^\t\n\r ]/.test(node.getText())) {
		if (tag == "name") { // TODO handle changing order 'name' and 'value'
			this.propertyName = node.getText();
		} else {
			this.addValueToParent(XmlRpc.getNodeData(node), parent);
		}

	} else {
		var children = parent;
		for ( var i = 0; i < node.getElements().length; i++) {
			children = this.unmarshal(node.getElements()[i], children);
		}
		parent = children;
	}

	return parent;
};

/**
 * <p>
 * Add value to parent object.
 * </p>
 * 
 * @param value
 *            Value added to parent object.
 * @param parent
 *            parent object.
 */
XmlRpcResponse.prototype.addValueToParent = function(value, parent) {
	switch (XmlRpc.getDataTag(parent)) {
	case "struct":
		parent[this.propertyName] = value;
		break;
	case "array":
		parent.push(value);
		break;
	case "dateTime.iso8601":
	case "int":
	case "double":
	case "string":
	case "base64":
		parent = value;
		break;
	}
};

/**
 * Date
 */

/**
 * <p>
 * Convert a GMT date to ISO8601.
 * </p>
 * 
 * @return <code>String</code> with an ISO8601 date.
 */
Date.prototype.toIso8601 = function() {
	year = this.getYear();
	if (year < 1900)
		year += 1900;
	month = this.getMonth() + 1;
	if (month < 10)
		month = "0" + month;
	day = this.getDate();
	if (day < 10)
		day = "0" + day;
	time = this.toTimeString().substr(0, 8);
	return year + month + day + "T" + time;
};

/**
 * <p>
 * Convert ISO8601 date to GMT.
 * </p>
 * 
 * @param value
 *            ISO8601 date.
 * @return GMT date.
 */
Date.fromIso8601 = function(value) {
	year = value.substr(0, 4);
	month = value.substr(4, 2);
	day = value.substr(6, 2);
	hour = value.substr(9, 2);
	minute = value.substr(12, 2);
	sec = value.substr(15, 2);
	return new Date(year, month - 1, day, hour, minute, sec, 0);
};

/**
 * Base64
 */
function Base64(value) {
	Base64.prototype.bytes = value;
};

/**
 * <p>
 * Encode the object bytes using base64 algorithm.
 * </p>
 * 
 * @return Encoded string.
 */
Base64.prototype.encode = function() {
	return Utilities.base64Encode(this.bytes);
};

/**
 * <p>
 * Decode the object bytes using base64 algorithm.
 * </p>
 * 
 * @return Decoded string.
 */
Base64.prototype.decode = function() {
	return Utilities.base64Decode(this.bytes);
};
