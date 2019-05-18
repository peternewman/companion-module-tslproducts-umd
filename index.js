var instance_skel = require('../../instance_skel');
var udp = require('../../udp');
var debug;
var log;

function instance(system, id, config) {
		var self = this;

		// super-constructor
		instance_skel.apply(this, arguments);
		self.actions(); // export actions
		return self;
}

instance.prototype.init = function () {
		var self = this;

		debug = self.debug;
		log = self.log;

		self.status(self.STATUS_UNKNOWN);

		if (self.config.host !== undefined) {
			self.udp = new udp(self.config.host, self.config.port);

			self.udp.on('status_change', function (status, message) {
				self.status(status, message);
			});

			self.udp.on('error', function () {
				// Ignore
			});
		}
};

instance.prototype.updateConfig = function (config) {
		var self = this;
		self.config = config;

		if (self.udp !== undefined) {
			self.udp.destroy();
			delete self.udp;
		}

		if (self.config.host !== undefined) {
			self.udp = new udp(self.config.host, self.config.port);

			self.udp.on('status_change', function (status, message) {
				self.status(status, message);
			});

			self.udp.on('error', function (message) {
				// ignore for now
			});
		}
};

instance.prototype.CHOICES_VERSIONS = [
	{ label: 'v3.1', id: '3' },
	{ label: 'v4.0', id: '4' }/*,
	{ label: 'v5.0', id: '5' }*/
];

// Return config fields for web config
instance.prototype.config_fields = function () {
		var self = this;
		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module is for the TSL protocol'
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				regex: self.REGEX_IP
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Target port',
				default: '40001',
				width: 6
			}
		]
};

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;

		if (self.udp !== undefined) {
			self.udp.destroy();
		}
		debug("destroy", self.id);
};

instance.prototype.actions = function (system) {
	var self = this;

	var actions = {
		'tallyV4': {
			label: 'TSL version 4',
			options: [ {
				type: 'textinput',
				label: 'Tally address',
				id: 'address',
				default: '0',
				regex: self.REGEX_NUMBER
			},{
				type: 'dropdown',
				label: 'Tally left/right',
				id: 'tallySide',
				default: 'left',
				choices: [{ label: 'Left', id: 'left'},{ label: 'Right', id: 'right'}]
			},{
				type: 'dropdown',
				label: 'Tally color',
				id: 'color',
				default: 'red',
				choices: [{ label: 'red', id: 'red'},{ label: 'green', id: 'green'},{ label: 'amber', id: 'amber'},{ label: 'off', id: 'off'}]
			},{
				type: 'textinput',
				label: 'UMD message',
				id: 'message',
				default: 'CAM 1'
			} ]
		},
		'tallyV3': {
			label: 'TSL version 3',
			options: [ {
				type: 'textinput',
				label: 'Tally address',
				id: 'address',
				default: '0',
				regex: self.REGEX_NUMBER
			},{
				type: 'dropdown',
				label: 'Tally number',
				id: 'tallyNumber',
				default: '1',
				choices: [{ label: '1', id: '1'},{ label: '2', id: '2'},{ label: '3', id: '3'},{ label: '4', id: '4'},{ label: 'off', id: 'off'}]
			},{
				type: 'textinput',
				label: 'UMD message',
				id: 'message',
				default: 'CAM 1'
			} ]
		}
	};
	self.setActions(actions);
};


instance.prototype.action = function (action) {
		var self = this;
		var id = action.action;
		var cmd;
		var opt = action.options;
		var bufAddress = Buffer.from([0x80 + parseInt(opt.address, 16)]);//Address + 0x80
		var bufTally = Buffer.alloc(1);
		var bufUMD = Buffer.alloc(16);
		var bufVBC = Buffer.from([0x02]);
		var bufXDATAend = Buffer.from([0x11])

		switch (id) {

			case 'tallyV4':
				// TODO: fix, the first part of 4.0 is a normal 3.1 tally section,
				// the following is incorrect:
				if (opt.tallySide == 'left' && opt.color == 'red') {
					bufTally = Buffer.from([0x01]);
				} else if ( opt.tallySide == 'right' && opt.color == 'red') {
					bufTally = Buffer.from([0x10]);
				} else if ( opt.tallySide == 'left' && opt.color == 'green') {
					bufTally = Buffer.from([0x02]);
				} else if ( opt.tallySide == 'right' && opt.color == 'green') {
					bufTally = Buffer.from([0x20]);
				} else if ( opt.tallySide == 'left' && opt.color == 'amber') {
					bufTally = Buffer.from([0x03]);
				} else if ( opt.tallySide == 'right' && opt.color == 'amber') {
					bufTally = Buffer.from([0x30]);
				} else {
					bufTally = Buffer.from([0x00]);
				}

				// Put UMD message and fill up characters to 16bytes
				var bufUMD = new Buffer(16);
				bufUMD.fill(0x20); // pad with spaces
				bufUMD.write(opt.message, 0);

				//set tally light for version 4.0
				if (opt.tallySide == 'left' && opt.color == 'red') {
					bufTally = Buffer.from([0x01]);
				} else if ( opt.tallySide == 'right' && opt.color == 'red') {
					bufTally = Buffer.from([0x10]);
				} else if ( opt.tallySide == 'left' && opt.color == 'green') {
					bufTally = Buffer.from([0x02]);
				} else if ( opt.tallySide == 'right' && opt.color == 'green') {
					bufTally = Buffer.from([0x20]);
				} else if ( opt.tallySide == 'left' && opt.color == 'amber') {
					bufTally = Buffer.from([0x03]);
				} else if ( opt.tallySide == 'right' && opt.color == 'amber') {
					bufTally = Buffer.from([0x30]);
				} else {
					bufTally = Buffer.from([0x00]);
				}

				// This is not really generating a checksum
				// TODO: sum all data % 128 (using a for loop)
				var bufChecksum = Buffer.from([(bufAddress + bufTally + bufUMD) % 128]);
	
				var bufXDATA = Buffer.concat([bufTally, bufXDATAend]);

				cmd = Buffer.concat([bufAddress, bufTally, arrayUMD, bufChecksum, bufVBC, bufXDATA]);

				break;

			case 'tallyV3':
				//set tally light for version 3.1
				if (opt.tallyNumber == '1') {
					bufTally = Buffer.from([0x31]);
				} else if (opt.tallyNumber == '2') {
					bufTally = Buffer.from([0x32]);
				} else if (opt.tallyNumber == '3') {
					bufTally = Buffer.from([0x34]);
				} else if ( opt.tallyNumber == '4') {
					bufTally = Buffer.from([0x38]);
				} else {
					bufTally = Buffer.from([0x30]);
				}

				// Put UMD message and fill up characters to 16bytes
				var bufUMD = new Buffer(16);
				bufUMD.fill(0x0); // ignore spec and pad with 0 for better aligning on Decimator etc
				bufUMD.write(opt.message, 0);

				cmd = Buffer.concat([bufAddress, bufTally, bufUMD]);

				break;

		}

		if (cmd !== undefined) {
			if (self.udp !== undefined) {
				debug('sending ', cmd, "to", self.udp.host);
				self.udp.send(cmd);
			}
		}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
