"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIosReactNativeMSAL = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const withIosUrlScheme = (config) => {
    if (!config.ios?.bundleIdentifier) {
        throw new Error('ios.bundleIdentifier is required in your expo config');
    }
    const QUERY_SCHEMES = ['msauthv2', 'msauthv3'];
    const URL_SCHEME = { CFBundleURLSchemes: [`msauth.${config.ios.bundleIdentifier}`] };
    return (0, config_plugins_1.withInfoPlist)(config, (mod) => {
        mod.modResults.CFBundleURLTypes = [URL_SCHEME, ...(mod.modResults.CFBundleURLTypes || [])];
        mod.modResults.LSApplicationQueriesSchemes = [
            ...new Set((mod.modResults.LSApplicationQueriesSchemes ?? []).concat(QUERY_SCHEMES)),
        ];
        return mod;
    });
};
const withIosKeychainGroup = (config) => {
    const KEYCHAIN_GROUP = '$(AppIdentifierPrefix)com.microsoft.adalcache';
    return (0, config_plugins_1.withEntitlementsPlist)(config, (mod) => {
        const existingAccessGroups = (mod.modResults['keychain-access-groups'] || []);
        mod.modResults['keychain-access-groups'] = [...new Set(existingAccessGroups.concat(KEYCHAIN_GROUP))];
        return mod;
    });
};
const withAppDelegateConfig = (config) => {
    return (0, config_plugins_1.withAppDelegate)(config, (mod) => {
        if (mod.modResults.language === 'objcpp' || mod.modResults.language === 'objc') {
            mod.modResults.contents = setAppDelegateObjC(mod.modResults.contents);
        }
        else if (mod.modResults.language === 'swift') {
            mod.modResults.contents = setAppDelegateSwift(mod.modResults.contents);
        }
        else {
            throw new Error(`Cannot modify AppDelegate because language '${mod.modResults.language}' is not supported. Supported languages: objc, objcpp, swift`);
        }
        return mod;
    });
};
function setAppDelegateObjC(appDelegate) {
    if (!appDelegate.includes('#import <MSAL/MSAL.h>')) {
        const [firstLine, ...restOfLines] = appDelegate.split('\n');
        appDelegate = firstLine + '\n\n#import <MSAL/MSAL.h>\n' + restOfLines.join('\n');
    }
    const linkingApiOriginal = `- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {`;
    const linkingApiChange = `- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<NSString *,id> *)options {`;
    const linkingApiReturnOriginal = `return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];`;
    const linkingApiReturnChange = `return [MSALPublicClientApplication handleMSALResponse:url sourceApplication:options[UIApplicationOpenURLOptionsSourceApplicationKey]];`;
    if (appDelegate.includes(linkingApiOriginal)) {
        appDelegate = appDelegate.replace(linkingApiOriginal, linkingApiChange);
    }
    if (appDelegate.includes(linkingApiReturnOriginal)) {
        appDelegate = appDelegate.replace(linkingApiReturnOriginal, linkingApiReturnChange);
    }
    return appDelegate;
}
function setAppDelegateSwift(appDelegate) {
    // Add MSAL import if needed
    if (!appDelegate.includes('import MSAL')) {
        // Find the import section and add MSAL import
        const importRegex = /^(import .+)$/m;
        if (appDelegate.match(importRegex)) {
            appDelegate = appDelegate.replace(importRegex, '$1\nimport MSAL');
        }
        else {
            // If no imports found, add at the beginning after any comments
            const lines = appDelegate.split('\n');
            let insertIndex = 0;
            // Skip initial comments
            while (insertIndex < lines.length && lines[insertIndex].trim().startsWith('//')) {
                insertIndex++;
            }
            lines.splice(insertIndex, 0, 'import MSAL');
            appDelegate = lines.join('\n');
        }
    }
    // Handle the openURL method for Swift
    const swiftOpenUrlPattern = /func application\(\s*_\s+app:\s*UIApplication,\s*open\s+url:\s*URL,\s*options:\s*\[UIApplication\.OpenURLOptionsKey\s*:\s*Any\]\s*=\s*\[:\]\s*\)\s*->\s*Bool\s*\{[^}]*\}/s;
    if (!swiftOpenUrlPattern.test(appDelegate)) {
        // Add the openURL method if it doesn't exist
        const classEndPattern = /^(\s*)\}(\s*)$/m;
        const openUrlMethod = `
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return MSALPublicClientApplication.handleMSALResponse(url, sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String) || super.application(app, open: url, options: options)
    }
`;
        appDelegate = appDelegate.replace(classEndPattern, `$1${openUrlMethod}$1}$2`);
    }
    else {
        // Modify existing openURL method to include MSAL handling
        appDelegate = appDelegate.replace(swiftOpenUrlPattern, (match) => {
            if (!match.includes('MSALPublicClientApplication.handleMSALResponse')) {
                // Find the return statement and modify it
                const returnPattern = /return\s+(.+)/;
                if (returnPattern.test(match)) {
                    return match.replace(returnPattern, 'return MSALPublicClientApplication.handleMSALResponse(url, sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String) || $1');
                }
                else {
                    // If no return statement, add MSAL handling before the closing brace
                    return match.replace(/(\s*)\}$/, '$1    return MSALPublicClientApplication.handleMSALResponse(url, sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String)\n$1}');
                }
            }
            return match;
        });
    }
    return appDelegate;
}
const withIosReactNativeMSAL = (config) => {
    return (0, config_plugins_1.withPlugins)(config, [withIosUrlScheme, withIosKeychainGroup, withAppDelegateConfig]);
};
exports.withIosReactNativeMSAL = withIosReactNativeMSAL;
