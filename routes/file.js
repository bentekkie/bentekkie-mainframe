/**
 * New node file
 */

exports.download = function(req, res) {
  res.download('./raw/'+req.params.fname);
}
