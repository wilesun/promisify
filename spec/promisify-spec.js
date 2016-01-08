require('./../promisify');

describe('promise的测试', function () {
    beforeEach(function () {
        Promise.emitter.clear('test1');
    });

    it('emiter只有一个且不带顺序的', function (done) {
        Promise.emitter.on('test1', function (aaa, bbb) {
            expect(aaa).toEqual('11');
            expect(bbb).toEqual('22');
            return true;
        });
        Promise.emitter.emit('test1', ['11', '22']).then(function (result) {
            expect(result).not.toBe(null);
            expect(result.length).toBe(1);
            expect(result[0]).toBe(true);
            done();
        });
    });
    it('emiter有二个以上且不带顺序的', function (done) {
        Promise.emitter.on('test1', function (aaa, bbb) {
            expect(aaa).toEqual('11');
            expect(bbb).toEqual('22');
            return true;
        });
        Promise.emitter.on('test1', function (aaa, bbb) {
            expect(aaa).toEqual('11');
            expect(bbb).toEqual('22');
            return true;
        });
        Promise.emitter.emit('test1', ['11', '22']).then(function (result) {
            expect(result).not.toBe(null);
            expect(result.length).toBe(2);
            expect(result[0]).toBe(true);
            expect(result[1]).toBe(true);
            done();
        });
    });
});
