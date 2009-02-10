APP_NAME=RejawFox

XPIDL=~/work/mozilla/obj-i386-apple-darwin9.4.0/dist/bin/xpidl
XPIDL_INCLUDE=~/work/mozilla/obj-i386-apple-darwin9.4.0/dist/idl

VERSION = $(shell cat install.rdf | perl ./tools/getver.pl)

BUILD_FILES = $(APP_NAME)*

all: build

components/%.xpt : components/%.idl
	$(XPIDL) -m typelib -w -v -I $(XPIDL_INCLUDE) -e $@ $<
	rm -f $(MOZILLA_PROFILE_PATH)/compreg.dat
	rm -f $(MOZILLA_PROFILE_PATH)/xpti.dat

build: test
	find . -name ".DS_Store" -exec rm -f {} \;
	sh ./build.sh

	mv $(APP_NAME).xpi $(APP_NAME)-$(VERSION).xpi
	perl ./tools/makehash.pl $(APP_NAME) $(VERSION)

test:
	@perl ./tools/check_locale.pl

copy: 
	s3cmd.rb put rejawfox:$(APP_NAME)-$(VERSION).xpi $(APP_NAME)-$(VERSION).xpi "x-amz-acl: public-read"
	s3cmd.rb put rejawfox:$(APP_NAME).rdf $(APP_NAME).rdf "x-amz-acl: public-read"
	echo "http://s3.amazonaws.com/rejawfox/$(APP_NAME)-$(VERSION).xpi"

clean:
	find . -name ".DS_Store" -exec rm -f {} \;
	rm -f $(BUILD_FILES)
