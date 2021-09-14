'use strict'

const defaultOptions = {ctx: {'tenantId':'default'}}

let getFullStateName = options => (stateCode) => {
    return new Promise((resolve,reject) => {
        console.log("In getFullStateName", stateCode, options);
        if (stateCode === "KA" || stateCode === "KAR")
            return resolve('Karnataka');
        if (stateCode === "KE" || stateCode === "KER")
            return resolve('Kerela');
        
        resolve(stateCode)
    }

    )
}

module.exports = options => ({
    getFullStateName : getFullStateName(options)
}

)