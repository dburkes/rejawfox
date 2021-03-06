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

clean:
	find . -name ".DS_Store" -exec rm -f {} \;
	rm -f $(BUILD_FILES)
