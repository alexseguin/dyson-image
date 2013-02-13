var http = require('http'),
    request = require('request'),
    when = require('when'),
    mmm = require('mmmagic'),
    Magic = mmm.Magic;

var magic = new Magic(mmm.MAGIC_MIME);

var imageCache = {};

var imageRequest = function(options) {

    options = options || {};

    var host = options.host || 'http://dummyimage.com',
        uri = host,
        deferred = when.defer();

    if(options.path) {
        uri += options.path;
    } else if(options.width && options.height) {
        uri += '/' + options.width + 'x' + options.height;
    } else if(options.width) {
        uri += '/' + options.width;
    }

    request({
        uri: uri,
        encoding: 'binary'
    }, function(error, response, body) {

        if(error) {
            deferred.reject(error);
        }

        if(!error && response.statusCode === 200) {

            var imageBuffer = new Buffer(body, 'binary');

            magic.detect(imageBuffer, function(error, mimeType) {

                if(error) {
                    deferred.reject(error);
                }

                deferred.resolve({
                    mimeType: mimeType.split(';')[0],
                    buffer: imageBuffer
                });
            });
        }
    });

    return deferred.promise;
};

var asMiddleware = function(req, res, next) {

    var path = req.url.replace('/image', '');

    console.log('Resolving response for', req.url, imageCache[path] ? '(cached)' : '');

    if(!imageCache[path]) {
        imageCache[path] = imageRequest({path: path});
    }

    imageCache[path].then(function(image) {
        res.setHeader('Content-Type', image.mimeType);
        res.write(image.buffer);
        res.send();
    });
};

module.exports = {
    request: imageRequest,
    asMiddleware: asMiddleware
};
