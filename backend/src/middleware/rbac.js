//src/middleware/rbac.js
const {AppError} = require('../utils/errors');

function requireRole(role) {
    return (req, res, next) =>{
        if(req.user.role !== role){
            return next(new AppError('Forbidden', 403, 'INSUFFICIENT_ROLE'));
        }
        next();
    }
}
module.exports = {requireRole};