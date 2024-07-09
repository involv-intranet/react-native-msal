require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-msal"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["repository"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.4" }
  s.source       = { :git => "git+ssh://git@github.com/involv-intranet/react-native-msal", :tag => "v#{s.version}" }

  s.source_files = "ios/**/*.{h,m}"

  s.dependency "React-Core"
  s.dependency "MSAL"
end
