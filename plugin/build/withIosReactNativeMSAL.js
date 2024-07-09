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
        if (mod.modResults.language === 'objcpp') {
            mod.modResults.contents = setAppDelegate(mod.modResults.contents);
        }
        else {
            throw new Error('Cannot modify AppDelegate because it is not in objective-c');
        }
        return mod;
    });
};
function setAppDelegate(appDelegate) {
    if (!appDelegate.includes('#import <MSAL/MSAL.h>')) {
        const [firstLine, ...restOfLines] = appDelegate.split('\n');
        appDelegate = firstLine + '\n\n#import <MSAL/MSAL.h>\n' + restOfLines.join('\n');
    }

    const linkingApiOriginal = `- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {`;
    const linkingApiChange = `- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<NSString *,id> *)options {`

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
const withIosReactNativeMSAL = (config) => {
    return (0, config_plugins_1.withPlugins)(config, [withIosUrlScheme, withIosKeychainGroup, withAppDelegateConfig]);
};
exports.withIosReactNativeMSAL = withIosReactNativeMSAL;
