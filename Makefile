APP_NAME=RejawFox

XPIDL=~/work/mozilla/obj-i386-apple-darwin9.4.0/dist/bin/xpidl
XPIDL_INCLUDE=~/work/mozilla/obj-i386-apple-darwin9.4.0/dist/idl

VERSION = $(shell cat install.rdf | perl ./tools/getver.pl)

BUILD_FILES = $(APP_NAME)* .htaccess

all: build

components/%.xpt : components/%.idl
	$(XPIDL) -m typelib -w -v -I $(XPIDL_INCLUDE) -e $@ $<
	rm -f $(MOZILLA_PROFILE_PATH)/compreg.dat
	rm -f $(MOZILLA_PROFILE_PATH)/xpti.dat

build: test
	find . -name ".DS_Store" -exec rm -f {} \;
	sh ./build.sh
	perl -p -e 's/\$$VERSION\$$/$(VERSION)/' htaccess > .htaccess

	mv $(APP_NAME).xpi $(APP_NAME)-$(VERSION).xpi
	perl ./tools/makehash.pl $(APP_NAME) $(VERSION)

test:
	@perl ./tools/check_locale.pl

update:
	@if grep 'signature' RejawFox.rdf; then  \
		scp $(BUILD_FILES) www.naan.net:naan.net/www/rejaw/ ; \
	else \
		echo "No signed signature to RejawFox.rdf"; \
	fi;

copy: build
	scp $(APP_NAME)-$(VERSION).xpi www.naan.net:naan.net/www/rejaw/
	echo "http://naan.net/rejaw/$(APP_NAME)-$(VERSION).xpi"

clean:
	find . -name ".DS_Store" -exec rm -f {} \;
	rm -f $(BUILD_FILES)
